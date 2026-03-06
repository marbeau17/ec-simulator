import { getFlashModel } from "./client";
import { SYSTEM_PROMPT } from "./prompts";

interface ChatMessage {
  role: string;
  content: string;
}

interface UserProfile {
  displayName: string;
  tags: string[];
  membershipTier: string;
}

interface ProcessChatParams {
  userMessage: string;
  conversationHistory: ChatMessage[];
  userProfile?: UserProfile;
}

interface ProcessChatResult {
  response: string;
  shouldEscalate: boolean;
  suggestedTags: string[];
}

const FALLBACK_RESPONSE =
  "申し訳ございません。ただいまシステムが混み合っております。しばらくしてから再度お試しください。";

const TIMEOUT_MS = 3000;

/**
 * Build the system prompt with user profile context if available.
 */
function buildSystemPrompt(userProfile?: UserProfile): string {
  if (!userProfile) {
    return SYSTEM_PROMPT;
  }

  const profileContext = `
## お客様情報
- お名前: ${userProfile.displayName}
- 会員ランク: ${userProfile.membershipTier}
- タグ: ${userProfile.tags.length > 0 ? userProfile.tags.join(", ") : "なし"}`;

  return `${SYSTEM_PROMPT}\n${profileContext}`;
}

/**
 * Build conversation context from history (last 10 messages).
 */
function buildConversationContext(
  history: ChatMessage[]
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  const recentHistory = history.slice(-10);

  return recentHistory.map((msg) => ({
    role: (msg.role === "assistant" ? "model" : "user") as "user" | "model",
    parts: [{ text: msg.content }],
  }));
}

/**
 * Parse the AI response to extract escalation flag and suggested tags.
 */
function parseResponse(rawResponse: string): {
  cleanResponse: string;
  shouldEscalate: boolean;
  suggestedTags: string[];
} {
  let cleanResponse = rawResponse;
  let shouldEscalate = false;
  const suggestedTags: string[] = [];

  // Check for [ESCALATE] tag
  if (cleanResponse.includes("[ESCALATE]")) {
    shouldEscalate = true;
    cleanResponse = cleanResponse.replace(/\[ESCALATE\]/g, "").trim();
  }

  // Extract [TAGS: ...] pattern
  const tagsMatch = cleanResponse.match(/\[TAGS:\s*(.+?)\]/);
  if (tagsMatch) {
    const tags = tagsMatch[1].split(",").map((tag) => tag.trim());
    suggestedTags.push(...tags.filter((tag) => tag.length > 0));
    cleanResponse = cleanResponse.replace(/\[TAGS:\s*.+?\]/g, "").trim();
  }

  return { cleanResponse, shouldEscalate, suggestedTags };
}

/**
 * Process a chat message using Gemini Flash model.
 *
 * @param params - Chat processing parameters
 * @returns Processed chat result with response, escalation flag, and suggested tags
 */
export async function processChat(
  params: ProcessChatParams
): Promise<ProcessChatResult> {
  const { userMessage, conversationHistory, userProfile } = params;

  try {
    const model = getFlashModel();
    const systemPrompt = buildSystemPrompt(userProfile);
    const history = buildConversationContext(conversationHistory);

    const chat = model.startChat({
      history,
      systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
    });

    // Create a promise that rejects after TIMEOUT_MS
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), TIMEOUT_MS);
    });

    // Race between the API call and timeout
    const result = await Promise.race([
      chat.sendMessage(userMessage),
      timeoutPromise,
    ]);

    const rawResponse = result.response.text();

    if (!rawResponse || rawResponse.trim().length === 0) {
      return {
        response: FALLBACK_RESPONSE,
        shouldEscalate: false,
        suggestedTags: [],
      };
    }

    const { cleanResponse, shouldEscalate, suggestedTags } =
      parseResponse(rawResponse);

    return {
      response: cleanResponse,
      shouldEscalate,
      suggestedTags,
    };
  } catch (error) {
    console.error("[processChat] Error:", error);

    if (error instanceof Error && error.message === "Gemini API timeout") {
      console.warn("[processChat] API call timed out after 3 seconds");
    }

    return {
      response: FALLBACK_RESPONSE,
      shouldEscalate: false,
      suggestedTags: [],
    };
  }
}
