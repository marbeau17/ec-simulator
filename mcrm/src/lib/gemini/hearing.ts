import { getFlashModel } from "./client";
import { HEARING_PROMPT } from "./prompts";

// ============================================================
// Types
// ============================================================

export interface HearingQuestion {
  id: string;
  text: string;
  type: "free_text" | "single_choice" | "multiple_choice";
  options?: string[];
  required: boolean;
}

export interface HearingScenario {
  id: string;
  title: string;
  questions: HearingQuestion[];
}

export interface AnsweredQuestion {
  questionId: string;
  answer: string;
  structuredAnswer?: Record<string, unknown>;
}

export interface HearingSession {
  scenarioId: string;
  answeredQuestions: AnsweredQuestion[];
  currentQuestionIndex: number;
  status: "in_progress" | "completed" | "abandoned";
}

export interface ProcessHearingParams {
  userMessage: string;
  session: HearingSession;
  scenario: HearingScenario;
}

export interface ProcessHearingResult {
  response: string;
  updatedSession: HearingSession;
  isComplete: boolean;
  extractedTags: string[];
}

// ============================================================
// Initial Hearing Scenario
// ============================================================

export const INITIAL_HEARING_SCENARIO: HearingScenario = {
  id: "initial_hearing",
  title: "初回ヒアリング",
  questions: [
    {
      id: "purpose",
      text: "武居商店をご利用いただくきっかけや目的を教えていただけますか？（例：自宅用、贈り物、イベント用など）",
      type: "free_text",
      required: true,
    },
    {
      id: "food_preference",
      text: "お好きな食べ物や、興味のある食品ジャンルはございますか？",
      type: "multiple_choice",
      options: [
        "和菓子",
        "洋菓子",
        "漬物・佃煮",
        "調味料",
        "お茶・飲料",
        "季節の特産品",
        "その他",
      ],
      required: true,
    },
    {
      id: "allergy",
      text: "食物アレルギーや、お避けになりたい食材はございますか？",
      type: "free_text",
      required: false,
    },
    {
      id: "budget",
      text: "ご予算の目安を教えていただけますか？",
      type: "single_choice",
      options: [
        "〜1,000円",
        "1,000〜3,000円",
        "3,000〜5,000円",
        "5,000〜10,000円",
        "10,000円以上",
      ],
      required: true,
    },
    {
      id: "frequency",
      text: "どのくらいの頻度でご利用いただけそうですか？",
      type: "single_choice",
      options: ["週に1回以上", "月に2〜3回", "月に1回", "数ヶ月に1回", "イベント時のみ"],
      required: true,
    },
  ],
};

// ============================================================
// Helpers
// ============================================================

const FALLBACK_RESPONSE =
  "申し訳ございません。ただいまシステムが混み合っております。しばらくしてから再度お試しください。";

const TIMEOUT_MS = 3000;

/**
 * Build the prompt for the current hearing step by filling template placeholders.
 */
function buildHearingPrompt(session: HearingSession, scenario: HearingScenario): string {
  const currentQuestion =
    session.currentQuestionIndex < scenario.questions.length
      ? scenario.questions[session.currentQuestionIndex]
      : null;

  const previousAnswers = session.answeredQuestions
    .map((aq) => {
      const q = scenario.questions.find((sq) => sq.id === aq.questionId);
      return `Q: ${q?.text ?? aq.questionId}\nA: ${aq.answer}`;
    })
    .join("\n");

  return HEARING_PROMPT.replace("{{scenarioTitle}}", scenario.title)
    .replace("{{currentQuestion}}", currentQuestion?.text ?? "（すべて完了）")
    .replace("{{currentIndex}}", String(session.currentQuestionIndex + 1))
    .replace("{{totalQuestions}}", String(scenario.questions.length))
    .replace("{{previousAnswers}}", previousAnswers || "なし");
}

/**
 * Extract tags from AI response in the format [TAGS: tag1, tag2].
 */
function extractTags(text: string): string[] {
  const match = text.match(/\[TAGS:\s*(.+?)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Remove meta tags from the visible response text.
 */
function cleanResponse(text: string): string {
  return text
    .replace(/\[COMPLETE\]/g, "")
    .replace(/\[TAGS:\s*.+?\]/g, "")
    .trim();
}

// ============================================================
// Main Processing Function
// ============================================================

/**
 * Process a hearing session message using Gemini Flash model.
 *
 * @param params - Hearing processing parameters
 * @returns Updated session state and AI response
 */
export async function processHearing(
  params: ProcessHearingParams
): Promise<ProcessHearingResult> {
  const { userMessage, session, scenario } = params;

  try {
    const model = getFlashModel();
    const prompt = buildHearingPrompt(session, scenario);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), TIMEOUT_MS);
    });

    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        systemInstruction: { role: "user", parts: [{ text: prompt }] },
      }),
      timeoutPromise,
    ]);

    const rawResponse = result.response.text();

    if (!rawResponse || rawResponse.trim().length === 0) {
      return {
        response: FALLBACK_RESPONSE,
        updatedSession: session,
        isComplete: false,
        extractedTags: [],
      };
    }

    const isComplete = rawResponse.includes("[COMPLETE]");
    const extractedTags = extractTags(rawResponse);
    const responseText = cleanResponse(rawResponse);

    // Record the answer for the current question
    const updatedAnsweredQuestions: AnsweredQuestion[] = [
      ...session.answeredQuestions,
      {
        questionId: scenario.questions[session.currentQuestionIndex]?.id ?? "unknown",
        answer: userMessage,
      },
    ];

    const nextIndex = session.currentQuestionIndex + 1;
    const reachedEnd = nextIndex >= scenario.questions.length;

    const updatedSession: HearingSession = {
      ...session,
      answeredQuestions: updatedAnsweredQuestions,
      currentQuestionIndex: reachedEnd ? session.currentQuestionIndex : nextIndex,
      status: isComplete || reachedEnd ? "completed" : "in_progress",
    };

    return {
      response: responseText,
      updatedSession,
      isComplete: isComplete || reachedEnd,
      extractedTags,
    };
  } catch (error) {
    console.error("[processHearing] Error:", error);

    if (error instanceof Error && error.message === "Gemini API timeout") {
      console.warn("[processHearing] API call timed out after 3 seconds");
    }

    return {
      response: FALLBACK_RESPONSE,
      updatedSession: session,
      isComplete: false,
      extractedTags: [],
    };
  }
}
