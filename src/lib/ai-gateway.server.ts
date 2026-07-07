// Server-only AI provider helper.
// Picks whichever provider key is present in the environment, so you can use
// Google Gemini (free), OpenAI, or Anthropic without code changes — just set
// the matching env var in Vercel. No dependency on Lovable's platform.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export function resolveAiModel(): LanguageModel | null {
  // Provider priority: Groq → Gemini → OpenAI → Anthropic (first key present wins).
  // Groq first — a genuinely free API tier (no credit card, works in most
  // regions), unlike Gemini's free tier which is unavailable in some places.
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    return createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groq,
    })(process.env.GROQ_MODEL || "llama-3.3-70b-versatile");
  }

  const gemini = process.env.GEMINI_API_KEY;
  if (gemini) {
    return createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      supportsStructuredOutputs: false,
      apiKey: gemini,
    })(process.env.GEMINI_MODEL || "gemini-2.0-flash-lite");
  }

  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: openai,
    })(process.env.OPENAI_MODEL || "gpt-4o-mini");
  }

  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (anthropic) {
    return createOpenAICompatible({
      name: "anthropic",
      baseURL: "https://api.anthropic.com/v1",
      apiKey: anthropic,
    })(process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest");
  }

  return null;
}

// A vision-capable model for the active provider (for image → study set).
export function resolveVisionModel(): LanguageModel | null {
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    return createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groq,
    })(process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct");
  }

  const gemini = process.env.GEMINI_API_KEY;
  if (gemini) {
    return createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      supportsStructuredOutputs: false,
      apiKey: gemini,
    })(process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash");
  }

  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: openai,
    })(process.env.OPENAI_VISION_MODEL || "gpt-4o-mini");
  }

  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (anthropic) {
    return createOpenAICompatible({
      name: "anthropic",
      baseURL: "https://api.anthropic.com/v1",
      apiKey: anthropic,
    })(process.env.ANTHROPIC_VISION_MODEL || "claude-3-5-sonnet-latest");
  }

  return null;
}
