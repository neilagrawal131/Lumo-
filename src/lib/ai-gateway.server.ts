// Server-only AI provider helper.
// Uses Google Gemini via its OpenAI-compatible endpoint with a key you control
// (GEMINI_API_KEY from Google AI Studio) — no dependency on Lovable's platform.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    supportsStructuredOutputs: false,
    apiKey,
  });
}
