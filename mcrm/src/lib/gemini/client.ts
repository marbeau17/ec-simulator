import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type SafetySetting,
} from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Get Gemini 2.0 Flash model instance (fast, cost-effective)
 * Use for: chat responses, structured output, hearing sessions
 */
export function getFlashModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    safetySettings,
  });
}

/**
 * Get Gemini 1.5 Pro model instance (higher quality)
 * Use for: analysis, weekly reports, complex reasoning
 */
export function getProModel() {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    safetySettings,
  });
}

export { genAI, safetySettings };
