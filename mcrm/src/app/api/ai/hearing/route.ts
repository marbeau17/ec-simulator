import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  processHearing,
  INITIAL_HEARING_SCENARIO,
  type HearingSession,
} from "@/lib/gemini/hearing";
import { checkRateLimit, recordUsage } from "@/lib/ai/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HearingRequestBody {
  userId: string;
  message: string;
  sessionId?: string;
}

/**
 * POST /api/ai/hearing
 * Process a hearing session message.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HearingRequestBody;
    const { userId, message, sessionId } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: "userId, message は必須です" },
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
    let session: HearingSession;
    let currentSessionId: string;

    if (sessionId) {
      // Load existing session
      const { data: existingSession, error: loadError } = await supabase
        .from("ai_hearings")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (loadError || !existingSession) {
        return NextResponse.json(
          { error: "セッションが見つかりません" },
          { status: 404 }
        );
      }

      currentSessionId = existingSession.id as string;
      session = existingSession.session_data as unknown as HearingSession;
    } else {
      // Create new session
      const newSession: HearingSession = {
        scenarioId: INITIAL_HEARING_SCENARIO.id,
        answeredQuestions: [],
        currentQuestionIndex: 0,
        status: "in_progress",
      };

      const { data: created, error: createError } = await supabase
        .from("ai_hearings")
        .insert({
          user_id: userId,
          scenario_id: INITIAL_HEARING_SCENARIO.id,
          session_data: newSession as unknown as Record<string, unknown>,
          status: "in_progress",
        })
        .select("id")
        .single();

      if (createError || !created) {
        console.error("[POST /api/ai/hearing] Session create error:", createError);
        return NextResponse.json(
          { error: "セッションの作成に失敗しました" },
          { status: 500 }
        );
      }

      currentSessionId = created.id as string;
      session = newSession;
    }

    // Process the hearing message
    recordUsage("flash");
    const result = await processHearing({
      userMessage: message,
      session,
      scenario: INITIAL_HEARING_SCENARIO,
    });

    // Update the session in the database
    await supabase
      .from("ai_hearings")
      .update({
        session_data: result.updatedSession as unknown as Record<string, unknown>,
        status: result.isComplete ? "completed" : "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentSessionId);

    // If the hearing is complete, save extracted tags and persona summary
    if (result.isComplete) {
      // Save extracted tags
      if (result.extractedTags.length > 0) {
        const tagInserts = result.extractedTags.map((tag) => ({
          user_id: userId,
          tag,
          source: "hearing",
        }));

        await supabase.from("user_tags").upsert(tagInserts, {
          onConflict: "user_id,tag",
          ignoreDuplicates: true,
        });
      }

      // Update AI persona summary
      const answeredSummary = result.updatedSession.answeredQuestions
        .map((aq) => {
          const question = INITIAL_HEARING_SCENARIO.questions.find(
            (q) => q.id === aq.questionId
          );
          return `${question?.text ?? aq.questionId}: ${aq.answer}`;
        })
        .join("\n");

      await supabase
        .from("customers")
        .update({
          ai_persona_summary: answeredSummary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    return NextResponse.json({
      response: result.response,
      isComplete: result.isComplete,
      sessionId: currentSessionId,
    });
  } catch (error) {
    console.error("[POST /api/ai/hearing] Unhandled error:", error);
    return NextResponse.json(
      { error: "ヒアリング処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
