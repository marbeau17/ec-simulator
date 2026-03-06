import { getProModel } from "./client";
import { ANALYST_PROMPT, WEEKLY_REPORT_PROMPT } from "./prompts";

// ============================================================
// Types
// ============================================================

export interface Insight {
  category: string;
  title: string;
  description: string;
  impact: "高" | "中" | "低";
  action: string;
}

export interface Recommendation {
  priority: "高" | "中" | "低";
  title: string;
  detail: string;
  expectedEffect: string;
}

export interface AnalysisResult {
  summary: string;
  insights: Insight[];
  recommendations: Recommendation[];
}

export interface WeeklyReport {
  summary: string;
  highlights: {
    positive: string[];
    negative: string[];
  };
  insights: Insight[];
  recommendations: Recommendation[];
  nextWeekActions: string[];
}

export interface DailyAnalysisData {
  customerCount: number;
  messageCount: number;
  reservationCount: number;
  newFollowers: number;
  period: string;
}

export interface WeeklyReportData {
  salesMetrics: Record<string, unknown>;
  segmentData: Record<string, unknown>;
  broadcastResults: Record<string, unknown>;
  period: string;
}

// ============================================================
// Helpers
// ============================================================

const TIMEOUT_MS = 30_000; // Analysis can take longer – 30 s

/**
 * Try to parse a JSON block from the model response.
 * Handles both raw JSON and fenced ```json ... ``` blocks.
 */
function extractJson<T>(text: string): T {
  // Try to find a fenced JSON block first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenced ? fenced[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${jsonStr.slice(0, 200)}`);
  }
}

// ============================================================
// Daily Analysis
// ============================================================

/**
 * Generate a daily analysis of key business metrics using Gemini Pro.
 */
export async function generateDailyAnalysis(
  data: DailyAnalysisData
): Promise<AnalysisResult> {
  try {
    const model = getProModel();

    const dataPrompt = `
## 分析対象データ（${data.period}）
- 顧客数: ${data.customerCount}人
- メッセージ数: ${data.messageCount}件
- 予約数: ${data.reservationCount}件
- 新規フォロワー: ${data.newFollowers}人

上記データに基づいて、日次分析レポートを生成してください。
必ず指定のJSON形式で出力してください。`;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), TIMEOUT_MS);
    });

    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: dataPrompt }] }],
        systemInstruction: { role: "user", parts: [{ text: ANALYST_PROMPT }] },
      }),
      timeoutPromise,
    ]);

    const rawResponse = result.response.text();

    if (!rawResponse || rawResponse.trim().length === 0) {
      throw new Error("Empty response from Gemini");
    }

    return extractJson<AnalysisResult>(rawResponse);
  } catch (error) {
    console.error("[generateDailyAnalysis] Error:", error);

    // Return a minimal fallback result
    return {
      summary: "分析の生成中にエラーが発生しました。データを確認の上、再度お試しください。",
      insights: [],
      recommendations: [],
    };
  }
}

// ============================================================
// Weekly Report
// ============================================================

/**
 * Generate a weekly report with detailed metrics analysis using Gemini Pro.
 */
export async function generateWeeklyReport(
  data: WeeklyReportData
): Promise<WeeklyReport> {
  try {
    const model = getProModel();

    const dataPrompt = `
## 分析対象データ（${data.period}）

### 売上指標
${JSON.stringify(data.salesMetrics, null, 2)}

### セグメントデータ
${JSON.stringify(data.segmentData, null, 2)}

### 配信結果
${JSON.stringify(data.broadcastResults, null, 2)}

上記データに基づいて、週次レポートを生成してください。
必ず指定のJSON形式で出力してください。`;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), TIMEOUT_MS);
    });

    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: dataPrompt }] }],
        systemInstruction: {
          role: "user",
          parts: [{ text: WEEKLY_REPORT_PROMPT }],
        },
      }),
      timeoutPromise,
    ]);

    const rawResponse = result.response.text();

    if (!rawResponse || rawResponse.trim().length === 0) {
      throw new Error("Empty response from Gemini");
    }

    return extractJson<WeeklyReport>(rawResponse);
  } catch (error) {
    console.error("[generateWeeklyReport] Error:", error);

    return {
      summary: "週次レポートの生成中にエラーが発生しました。データを確認の上、再度お試しください。",
      highlights: { positive: [], negative: [] },
      insights: [],
      recommendations: [],
      nextWeekActions: [],
    };
  }
}
