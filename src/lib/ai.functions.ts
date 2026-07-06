import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createGeminiProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "gemini-2.0-flash";

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
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("AI is not configured yet. Add a GEMINI_API_KEY.");
    const gateway = createGeminiProvider(key);

    const prompt = `Create ${data.count} high-quality study flashcards about the following topic or notes.
Difficulty: ${data.difficulty}. Audience: ${data.ageGroup}. ${ageStyle[data.ageGroup]}
Each flashcard has a "front" (a concise question or term) and a "back" (a clear, correct answer/explanation).
Return ONLY a JSON array like: [{"front":"...","back":"..."}]. No commentary.

TOPIC / NOTES:
${data.topic}`;

    const { text } = await generateText({ model: gateway(MODEL), prompt });
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
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("AI is not configured yet. Add a GEMINI_API_KEY.");
    const gateway = createGeminiProvider(key);

    const prompt = `Create a quiz of ${data.count} questions about the topic or notes below.
Difficulty: ${data.difficulty}. Audience: ${data.ageGroup}. ${ageStyle[data.ageGroup]}
Mix question types: "multiple_choice" (4 options), "true_false" (options ["True","False"]), and "short_answer" (options []).
For each question include: "type", "question", "options" (array of strings), "answer" (the exact correct option text, or for short_answer the ideal short answer), and "explanation" (why the answer is correct).
Return ONLY a JSON array of question objects. No commentary.

TOPIC / NOTES:
${data.topic}`;

    const { text } = await generateText({ model: gateway(MODEL), prompt });
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
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("AI is not configured yet. Add a GEMINI_API_KEY.");
    const gateway = createGeminiProvider(key);
    const prompt = `Write a concise study guide about "${data.topic}" for a ${data.ageGroup} learner. ${ageStyle[data.ageGroup]}
Return JSON: {"summary":"2-3 sentence overview","keyConcepts":["..."],"vocabulary":[{"term":"","definition":""}],"practiceQuestions":["..."]}. Return ONLY JSON.`;
    const { text } = await generateText({ model: gateway(MODEL), prompt });
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
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("AI is not configured yet. Add a GEMINI_API_KEY.");
    const gateway = createGeminiProvider(key);
    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: `Question: ${data.question}\nCorrect answer: ${data.correct}\nLearner's answer: ${data.chosen}\nIn 2-3 friendly sentences, explain why the correct answer is right and gently clarify the mistake.`,
    });
    return { explanation: text.trim() };
  });
