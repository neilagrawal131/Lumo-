import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError, type LanguageModel } from "ai";
import { z } from "zod";
import { resolveAiModel, resolveVisionModel } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NO_AI = "AI is not configured yet. Add a GROQ_API_KEY (free) — or GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY — in Vercel, then redeploy.";

const ageStyle: Record<string, string> = {
  kids: "Use very simple words a young child understands, short sentences, and a friendly, playful tone. Keep facts concrete.",
  teens: "Use clear, engaging language suited to teenagers. Relatable examples, moderate depth.",
  college: "Use precise, academic language with proper terminology and solid depth for a college student.",
  adults: "Use clear, professional, efficient language for an adult lifelong learner.",
};

function safeParseModelJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
  const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(slice);
}

// Logs the provider's raw error detail to the server (never to the user), then
// throws a short, friendly message. The AI SDK wraps failures in a RetryError;
// the real provider error is nested in lastError/errors.
function aiError(e: unknown): never {
  const top = e as { lastError?: unknown; errors?: unknown[]; statusCode?: number };
  const inner = (top.lastError ??
    (Array.isArray(top.errors) ? top.errors[top.errors.length - 1] : undefined) ??
    top) as { statusCode?: number; responseBody?: string; data?: unknown; message?: string };
  const status = inner.statusCode ?? top.statusCode;
  const raw = inner.responseBody ?? inner.data ?? inner.message ?? String(inner);
  const detail = (typeof raw === "string" ? raw : JSON.stringify(raw)).replace(/\s+/g, " ").slice(0, 600);

  // Server-side only — visible in Vercel logs for debugging, never sent to the client.
  console.error(`[AI] request failed${status ? ` [${status}]` : ""}: ${detail}`);

  if (status === 429 || /rate.?limit|quota|too many requests/i.test(detail)) {
    throw new Error("The AI is busy right now. Please wait a minute and try again.");
  }
  if (status === 401 || status === 403) {
    throw new Error("The AI service key looks invalid. Please check the API key configuration.");
  }
  if (status === 402 || /insufficient|billing|payment/i.test(detail)) {
    throw new Error("The AI service needs billing set up. Please check your provider account.");
  }
  if (status && status >= 500) {
    throw new Error("The AI service is temporarily unavailable. Please try again in a moment.");
  }
  throw new Error("The AI couldn't complete that request. Please try again.");
}

async function runText(model: LanguageModel, prompt: string): Promise<string> {
  try {
    const { text } = await generateText({ model, prompt, maxRetries: 1 });
    return text;
  } catch (e) {
    aiError(e);
  }
}

// ---------- Flashcards ----------
const FlashcardInput = z.object({
  topic: z.string().min(1).max(4000),
  count: z.number().int().min(3).max(20).default(10),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  ageGroup: z.enum(["kids", "teens", "college", "adults"]).default("adults"),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FlashcardInput.parse(d))
  .handler(async ({ data }) => {
    const aiModel = resolveAiModel();
    if (!aiModel) throw new Error(NO_AI);

    const prompt = `Create ${data.count} high-quality study flashcards about the following topic or notes.
Difficulty: ${data.difficulty}. Audience: ${data.ageGroup}. ${ageStyle[data.ageGroup]}
Each flashcard has a "front" (a concise question or term) and a "back" (a clear, correct answer/explanation).
Return ONLY a JSON array like: [{"front":"...","back":"..."}]. No commentary.

TOPIC / NOTES:
${data.topic}`;

    const text = await runText(aiModel, prompt);
    let parsed: unknown;
    try {
      parsed = safeParseModelJson(text);
    } catch {
      throw new Error("The AI response could not be read. Please try again.");
    }
    const schema = z.array(z.object({ front: z.string(), back: z.string() }));
    const cards = schema.parse(parsed).slice(0, data.count);
    const title = data.topic.trim().split("\n")[0].slice(0, 60) || "Study set";
    return { title, cards };
  });

// ---------- Quiz ----------
const QuizInput = z.object({
  topic: z.string().min(1).max(4000),
  count: z.number().int().min(3).max(15).default(8),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  ageGroup: z.enum(["kids", "teens", "college", "adults"]).default("adults"),
});

export type QuizQuestion = {
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data }) => {
    const aiModel = resolveAiModel();
    if (!aiModel) throw new Error(NO_AI);

    const prompt = `Create a quiz of ${data.count} questions about the topic or notes below.
Difficulty: ${data.difficulty}. Audience: ${data.ageGroup}. ${ageStyle[data.ageGroup]}
Mix question types: "multiple_choice" (4 options), "true_false" (options ["True","False"]), and "short_answer" (options []).
For each question include: "type", "question", "options" (array of strings), "answer" (the exact correct option text, or for short_answer the ideal short answer), and "explanation" (why the answer is correct).
Return ONLY a JSON array of question objects. No commentary.

TOPIC / NOTES:
${data.topic}`;

    const text = await runText(aiModel, prompt);
    let parsed: unknown;
    try {
      parsed = safeParseModelJson(text);
    } catch {
      throw new Error("The AI response could not be read. Please try again.");
    }
    const schema = z.array(
      z.object({
        type: z.enum(["multiple_choice", "true_false", "short_answer"]).catch("multiple_choice"),
        question: z.string(),
        options: z.array(z.string()).default([]),
        answer: z.string(),
        explanation: z.string().default(""),
      }),
    );
    const questions = schema.parse(parsed).slice(0, data.count);
    const title = data.topic.trim().split("\n")[0].slice(0, 60) || "Quiz";
    return { title, questions };
  });

// ---------- Study material summary ----------
const SummaryInput = z.object({
  topic: z.string().min(1).max(4000),
  ageGroup: z.enum(["kids", "teens", "college", "adults"]).default("adults"),
});

export const generateStudyGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SummaryInput.parse(d))
  .handler(async ({ data }) => {
    const aiModel = resolveAiModel();
    if (!aiModel) throw new Error(NO_AI);
    const prompt = `Write a concise study guide about "${data.topic}" for a ${data.ageGroup} learner. ${ageStyle[data.ageGroup]}
Return JSON: {"summary":"2-3 sentence overview","keyConcepts":["..."],"vocabulary":[{"term":"","definition":""}],"practiceQuestions":["..."]}. Return ONLY JSON.`;
    const text = await runText(aiModel, prompt);
    try {
      const parsed = safeParseModelJson(text);
      return z
        .object({
          summary: z.string().default(""),
          keyConcepts: z.array(z.string()).default([]),
          vocabulary: z.array(z.object({ term: z.string(), definition: z.string() })).default([]),
          practiceQuestions: z.array(z.string()).default([]),
        })
        .parse(parsed);
    } catch (e) {
      if (e instanceof NoObjectGeneratedError) throw new Error("Please try again.");
      throw new Error("The AI response could not be read. Please try again.");
    }
  });

// ---------- Explanation for a wrong answer ----------
const ExplainInput = z.object({
  question: z.string().min(1).max(2000),
  correct: z.string().max(1000),
  chosen: z.string().max(1000),
});
export const explainAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExplainInput.parse(d))
  .handler(async ({ data }) => {
    const aiModel = resolveAiModel();
    if (!aiModel) throw new Error(NO_AI);
    const text = await runText(
      aiModel,
      `Question: ${data.question}\nCorrect answer: ${data.correct}\nLearner's answer: ${data.chosen}\nIn 2-3 friendly sentences, explain why the correct answer is right and gently clarify the mistake.`,
    );
    return { explanation: text.trim() };
  });

// ---------- Hint (no spoilers) ----------
const HintInput = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().max(1000).optional(),
});
export const getHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => HintInput.parse(d))
  .handler(async ({ data }) => {
    const aiModel = resolveAiModel();
    if (!aiModel) throw new Error(NO_AI);
    const text = await runText(
      aiModel,
      `Give ONE short hint (max 1 sentence) that nudges the learner toward the answer WITHOUT revealing it. Do not state or spell the answer.
Question: ${data.question}${data.answer ? `\n(The answer is "${data.answer}" — never reveal it.)` : ""}`,
    );
    return { hint: text.trim() };
  });

// ---------- Rewrite a flashcard easier / harder ----------
const RewriteInput = z.object({
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(2000),
  direction: z.enum(["easier", "harder"]),
  ageGroup: z.enum(["kids", "teens", "college", "adults"]).default("adults"),
});
export const rewriteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RewriteInput.parse(d))
  .handler(async ({ data }) => {
    const aiModel = resolveAiModel();
    if (!aiModel) throw new Error(NO_AI);
    const goal =
      data.direction === "easier"
        ? "Make it simpler and easier to understand — plainer wording, a clearer or more basic version of the same concept."
        : "Make it more challenging — more precise, deeper, or more advanced, while testing the same underlying concept.";
    const text = await runText(
      aiModel,
      `Rewrite this flashcard. ${goal} Keep it about the same topic. ${ageStyle[data.ageGroup]}
Return ONLY JSON: {"front":"...","back":"..."}.
Current front: ${data.front}
Current back: ${data.back}`,
    );
    try {
      const parsed = safeParseModelJson(text);
      return z.object({ front: z.string(), back: z.string() }).parse(parsed);
    } catch {
      throw new Error("The AI response could not be read. Please try again.");
    }
  });

// ---------- Study set from an image (vision) ----------
const ImageSetInput = z.object({
  image: z.string().min(1).max(12_000_000), // data URL
  count: z.number().int().min(3).max(20).default(10),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  ageGroup: z.enum(["kids", "teens", "college", "adults"]).default("adults"),
});
export const generateSetFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImageSetInput.parse(d))
  .handler(async ({ data }) => {
    const model = resolveVisionModel();
    if (!model) throw new Error(NO_AI);
    const prompt = `Look at this image — it may be class notes, a textbook page, a diagram, a slide, or a photo. Read and understand its content, then create ${data.count} study flashcards from it.
Difficulty: ${data.difficulty}. Audience: ${data.ageGroup}. ${ageStyle[data.ageGroup]}
Each flashcard has a "front" (a concise question or term) and a "back" (a clear, correct answer).
Return ONLY JSON: {"title":"a short title","cards":[{"front":"...","back":"..."}]}.`;

    let text = "";
    try {
      const res = await generateText({
        model,
        maxRetries: 1,
        messages: [
          { role: "user", content: [{ type: "text", text: prompt }, { type: "image", image: data.image }] },
        ],
      });
      text = res.text;
    } catch (e) {
      aiError(e);
    }

    try {
      const parsed = safeParseModelJson(text) as { title?: unknown; cards?: unknown };
      const cards = z.array(z.object({ front: z.string(), back: z.string() })).parse(parsed.cards ?? parsed).slice(0, data.count);
      const title = (typeof parsed.title === "string" && parsed.title.trim()) || "Study set from image";
      return { title, cards };
    } catch {
      throw new Error("Couldn't read that image clearly. Try a sharper photo, or crop to just the text.");
    }
  });

// ---------- Related topics ----------
const RelatedInput = z.object({ topic: z.string().min(1).max(2000) });
export const relatedTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RelatedInput.parse(d))
  .handler(async ({ data }) => {
    const aiModel = resolveAiModel();
    if (!aiModel) throw new Error(NO_AI);
    const text = await runText(
      aiModel,
      `Suggest 6 concise related study topics someone learning about "${data.topic}" should explore next. Return ONLY a JSON array of short topic strings.`,
    );
    try {
      const parsed = safeParseModelJson(text);
      return { topics: z.array(z.string()).parse(parsed).slice(0, 6) };
    } catch {
      return { topics: [] as string[] };
    }
  });
