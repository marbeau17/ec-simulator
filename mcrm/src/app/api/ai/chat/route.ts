import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processChat } from "@/lib/gemini/chat";
import { checkRateLimit, recordUsage } from "@/lib/ai/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  conversationId: string;
  message: string;
  userId: string;
}

/**
 * POST /api/ai/chat
 * Process a chat message through the AI assistant.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const { conversationId, message, userId } = body;

    if (!conversationId || !message || !userId) {
      return NextResponse.json(
        { error: "conversationId, message, userId は必須です" },
        { status: 400 }
      );
    }

    // Rate limit check
    const rateCheck = checkRateLimit("flash");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "リクエストが多すぎます。しばらくしてから再度お試しください。",
          retryAfterMs: rateCheck.retryAfterMs,
        },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    // Load conversation history
    const { data: messages, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (historyError) {
      console.error("[POST /api/ai/chat] History load error:", historyError);
    }

    const conversationHistory = (messages ?? []).map((m) => ({
      role: m.role as string,
      content: m.content as string,
    }));

    // Load user profile and tags
    const { data: profile } = await supabase
      .from("customers")
      .select("display_name, membership_tier")
      .eq("id", userId)
      .single();

    const { data: userTags } = await supabase
      .from("user_tags")
      .select("tag")
      .eq("user_id", userId);

    const userProfile = profile
      ? {
          displayName: (profile.display_name as string) ?? "お客様",
          tags: (userTags ?? []).map((t) => t.tag as string),
          membershipTier: (profile.membership_tier as string) ?? "一般",
        }
      : undefined;

    // Process the chat message
    recordUsage("flash");
    const result = await processChat({
      userMessage: message,
      conversationHistory,
      userProfile,
    });

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
      user_id: userId,
    });

    // Save AI response
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: result.response,
      metadata: {
        should_escalate: result.shouldEscalate,
        suggested_tags: result.suggestedTags,
      },
    });

    // If there are suggested tags, save them
    if (result.suggestedTags.length > 0) {
      const tagInserts = result.suggestedTags.map((tag) => ({
        user_id: userId,
        tag,
        source: "ai_suggested",
      }));

      await supabase.from("user_tags").upsert(tagInserts, {
        onConflict: "user_id,tag",
        ignoreDuplicates: true,
      });
    }

    return NextResponse.json({
      response: result.response,
      shouldEscalate: result.shouldEscalate,
    });
  } catch (error) {
    console.error("[POST /api/ai/chat] Unhandled error:", error);
    return NextResponse.json(
      { error: "チャット処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
