import { getFlashModel } from "./client";

// ============================================================
// Types
// ============================================================

export interface AllergyInfo {
  allergen: string;
  severity: "confirmed" | "suspected";
}

export interface PreferenceInfo {
  category: string;
  preference: string;
  strength: "strong" | "moderate" | "weak";
}

// ============================================================
// Generic Structured Output
// ============================================================

const TIMEOUT_MS = 5_000;

/**
 * Parse free-text into a structured JSON object using Gemini Flash.
 *
 * @param text - The free-text input to structure
 * @param schema - A JSON-schema-like description of the expected output
 * @param instruction - Additional instruction for how to interpret the text
 * @returns Parsed structured output of type T
 */
export async function structureFreeText<T>(
  text: string,
  schema: object,
  instruction: string
): Promise<T> {
  const model = getFlashModel();

  const prompt = `以下のテキストを解析し、指定されたJSON形式で出力してください。

## 指示
${instruction}

## 期待するJSONスキーマ
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

## 入力テキスト
${text}

## 出力
必ず有効なJSONのみを出力してください。説明やマークダウンのコードフェンスは不要です。`;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), TIMEOUT_MS);
    });

    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ]);

    const rawResponse = result.response.text();

    if (!rawResponse || rawResponse.trim().length === 0) {
      throw new Error("Empty response from Gemini");
    }

    // Strip optional code fences
    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/```\s*$/m, "")
      .trim();

    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error("[structureFreeText] Error:", error);
    throw new Error(
      `テキストの構造化に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================================
// Allergy Extraction
// ============================================================

const ALLERGY_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      allergen: {
        type: "string",
        description: "アレルゲンの名前（例: 卵、小麦、そば）",
      },
      severity: {
        type: "string",
        enum: ["confirmed", "suspected"],
        description: "confirmed = 確定、suspected = 疑い・可能性あり",
      },
    },
    required: ["allergen", "severity"],
  },
};

const ALLERGY_INSTRUCTION = `ユーザーのテキストからアレルギー情報を抽出してください。
- 「○○アレルギーです」「○○は食べられません」→ confirmed
- 「○○は苦手かも」「○○を避けたい」→ suspected
- アレルギー情報が含まれていない場合は空の配列を返してください。`;

/**
 * Extract allergy information from free-text.
 */
export async function extractAllergyInfo(text: string): Promise<AllergyInfo[]> {
  try {
    return await structureFreeText<AllergyInfo[]>(
      text,
      ALLERGY_SCHEMA,
      ALLERGY_INSTRUCTION
    );
  } catch (error) {
    console.error("[extractAllergyInfo] Error:", error);
    return [];
  }
}

// ============================================================
// Preference Extraction
// ============================================================

const PREFERENCE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "嗜好のカテゴリ（例: 食品ジャンル、味の好み、用途）",
      },
      preference: {
        type: "string",
        description: "具体的な嗜好内容",
      },
      strength: {
        type: "string",
        enum: ["strong", "moderate", "weak"],
        description: "strong = 強い嗜好、moderate = 普通、weak = 軽い興味",
      },
    },
    required: ["category", "preference", "strength"],
  },
};

const PREFERENCE_INSTRUCTION = `ユーザーのテキストからお好み・嗜好情報を抽出してください。
- 「大好き」「いつも買う」「絶対必要」→ strong
- 「好き」「よく食べる」「興味がある」→ moderate
- 「たまに」「少し気になる」「試してみたい」→ weak
- 嗜好情報が含まれていない場合は空の配列を返してください。`;

/**
 * Extract preference information from free-text.
 */
export async function extractPreferences(text: string): Promise<PreferenceInfo[]> {
  try {
    return await structureFreeText<PreferenceInfo[]>(
      text,
      PREFERENCE_SCHEMA,
      PREFERENCE_INSTRUCTION
    );
  } catch (error) {
    console.error("[extractPreferences] Error:", error);
    return [];
  }
}
