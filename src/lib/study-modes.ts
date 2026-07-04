// Shared types, metadata and pure builders for the one-click study modes.
// Everything here is dependency-free and runs on the client — study modes are
// derived from a set's existing flashcards (front = prompt/term, back = answer).

export type StudyCard = {
  id: string;
  front: string;
  back: string;
  image_url?: string | null;
};

export type StudyModeKey =
  | "flashcards"
  | "mcq"
  | "truefalse"
  | "fill"
  | "matching"
  | "short"
  | "mixed"
  | "practice"
  | "timed"
  | "guide"
  | "summary"
  | "vocab"
  | "concepts";

export type ModeGroup = "learn" | "quiz" | "review";

export type ModeMeta = {
  key: StudyModeKey;
  label: string;
  description: string;
  group: ModeGroup;
  /** Minimum usable cards required for the mode to work well. */
  minCards: number;
  /** Graded modes run through the quiz engine and award XP on completion. */
  graded?: boolean;
};

export const STUDY_MODES: ModeMeta[] = [
  { key: "flashcards", label: "Flashcards", description: "Flip through cards with spaced repetition.", group: "learn", minCards: 1 },
  { key: "mcq", label: "Multiple Choice", description: "Pick the correct answer from four options.", group: "quiz", minCards: 2, graded: true },
  { key: "truefalse", label: "True / False", description: "Decide whether each statement is correct.", group: "quiz", minCards: 2, graded: true },
  { key: "fill", label: "Fill in the Blank", description: "Type the missing word or answer.", group: "quiz", minCards: 1, graded: true },
  { key: "matching", label: "Matching", description: "Match each term to its definition.", group: "quiz", minCards: 3, graded: true },
  { key: "short", label: "Short Answer", description: "Write the answer, then check yourself.", group: "quiz", minCards: 1, graded: true },
  { key: "mixed", label: "Mixed Quiz", description: "A mix of every question type.", group: "quiz", minCards: 2, graded: true },
  { key: "practice", label: "Practice Test", description: "A full graded test you review at the end.", group: "quiz", minCards: 2, graded: true },
  { key: "timed", label: "Timed Exam", description: "A practice test against the clock.", group: "quiz", minCards: 2, graded: true },
  { key: "guide", label: "Study Guide", description: "An AI overview with concepts, vocab and practice.", group: "review", minCards: 1 },
  { key: "summary", label: "Summary", description: "A quick AI summary of the material.", group: "review", minCards: 1 },
  { key: "vocab", label: "Vocabulary List", description: "Every term and definition in one place.", group: "review", minCards: 1 },
  { key: "concepts", label: "Key Concepts", description: "The most important ideas to remember.", group: "review", minCards: 1 },
];

export const MODE_MAP: Record<StudyModeKey, ModeMeta> = Object.fromEntries(
  STUDY_MODES.map((m) => [m.key, m]),
) as Record<StudyModeKey, ModeMeta>;

export function isStudyMode(v: unknown): v is StudyModeKey {
  return typeof v === "string" && v in MODE_MAP;
}

export const modeLabel = (k: StudyModeKey): string => MODE_MAP[k]?.label ?? "Study";

// ---------- Helpers ----------

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function usableCards(cards: readonly StudyCard[]): StudyCard[] {
  return cards.filter((c) => c.front?.trim() && c.back?.trim());
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lenient text grading for typed answers (fill / short). */
export function isCorrectText(input: string, answer: string): boolean {
  const a = normalize(input);
  const b = normalize(answer);
  if (!a || !b) return false;
  if (a === b) return true;
  // Accept partial matches for short answers.
  if (b.length <= 28 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

// ---------- Question builders ----------

export type GradedQuestion =
  | { kind: "mcq"; cardId: string; prompt: string; options: string[]; answer: string }
  | { kind: "truefalse"; cardId: string; prompt: string; term: string; shown: string; answer: "True" | "False" }
  | { kind: "fill"; cardId: string; prompt: string; answer: string; hint?: string }
  | { kind: "short"; cardId: string; prompt: string; answer: string };

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "was", "were",
  "for", "with", "that", "this", "it", "as", "by", "on", "at", "be", "from",
  "which", "when", "where", "who", "what", "into", "than", "then", "they",
]);

function pickDistractors(cards: readonly StudyCard[], correct: string, n = 3): string[] {
  const pool = shuffle(cards.map((c) => c.back).filter((b) => normalize(b) !== normalize(correct)));
  const picked: string[] = [];
  for (const b of pool) {
    if (!picked.some((u) => normalize(u) === normalize(b))) picked.push(b);
    if (picked.length >= n) break;
  }
  return picked;
}

export function buildMcq(card: StudyCard, all: readonly StudyCard[]): GradedQuestion {
  const options = shuffle([card.back, ...pickDistractors(all, card.back, 3)]);
  return { kind: "mcq", cardId: card.id, prompt: card.front, options, answer: card.back };
}

export function buildTrueFalse(card: StudyCard, all: readonly StudyCard[]): GradedQuestion {
  const others = all.filter((c) => c.id !== card.id && normalize(c.back) !== normalize(card.back));
  const makeFalse = others.length > 0 && Math.random() < 0.5;
  if (makeFalse) {
    const shown = others[Math.floor(Math.random() * others.length)].back;
    return { kind: "truefalse", cardId: card.id, term: card.front, prompt: card.front, shown, answer: "False" };
  }
  return { kind: "truefalse", cardId: card.id, term: card.front, prompt: card.front, shown: card.back, answer: "True" };
}

export function buildFill(card: StudyCard): GradedQuestion {
  const words = card.back.split(/\s+/);
  let idx = -1;
  let best = 0;
  words.forEach((w, i) => {
    const clean = w.replace(/[^\p{L}\p{N}]/gu, "");
    if (clean.length > best && clean.length >= 4 && !STOP_WORDS.has(clean.toLowerCase())) {
      best = clean.length;
      idx = i;
    }
  });
  if (idx >= 0 && words.length >= 3) {
    const answer = words[idx].replace(/[^\p{L}\p{N}]/gu, "");
    const blanked = words.map((w, i) => (i === idx ? w.replace(/[\p{L}\p{N}]/gu, "_") : w)).join(" ");
    return { kind: "fill", cardId: card.id, prompt: blanked, answer, hint: card.front };
  }
  return { kind: "fill", cardId: card.id, prompt: card.front, answer: card.back, hint: "Type the answer" };
}

export function buildShort(card: StudyCard): GradedQuestion {
  return { kind: "short", cardId: card.id, prompt: card.front, answer: card.back };
}

/** Grade a single answer. `override` lets the learner self-mark a typed answer correct. */
export function gradeAnswer(q: GradedQuestion, resp: string | undefined, override?: boolean): boolean {
  if (override) return true;
  if (!resp) return false;
  switch (q.kind) {
    case "mcq":
    case "truefalse":
      return resp === q.answer;
    case "fill":
    case "short":
      return isCorrectText(resp, q.answer);
  }
}

function buildMixedOne(card: StudyCard, all: readonly StudyCard[]): GradedQuestion {
  const kinds: Array<"mcq" | "truefalse" | "fill" | "short"> = ["fill", "short"];
  if (all.length >= 2) kinds.push("mcq", "truefalse");
  const k = kinds[Math.floor(Math.random() * kinds.length)];
  if (k === "mcq") return buildMcq(card, all);
  if (k === "truefalse") return buildTrueFalse(card, all);
  if (k === "fill") return buildFill(card);
  return buildShort(card);
}

/** Build the full question list for a graded mode. */
export function buildQuestions(mode: StudyModeKey, cards: readonly StudyCard[]): GradedQuestion[] {
  const all = usableCards(cards);
  const pool = shuffle(all);
  switch (mode) {
    case "mcq":
      return pool.map((c) => buildMcq(c, all));
    case "truefalse":
      return pool.map((c) => buildTrueFalse(c, all));
    case "fill":
      return pool.map((c) => buildFill(c));
    case "short":
      return pool.map((c) => buildShort(c));
    case "mixed":
    case "practice":
    case "timed":
      return pool.map((c) => buildMixedOne(c, all));
    default:
      return [];
  }
}

// ---------- Matching ----------

export type MatchItem = { cardId: string; text: string };
export type MatchRound = { terms: MatchItem[]; defs: MatchItem[] };

export function buildMatching(cards: readonly StudyCard[], groupSize = 5): MatchRound[] {
  const all = shuffle(usableCards(cards));
  const rounds: MatchRound[] = [];
  for (let i = 0; i < all.length; i += groupSize) {
    const group = all.slice(i, i + groupSize);
    if (group.length < 2) break; // don't leave a lone card unmatched
    rounds.push({
      terms: group.map((c) => ({ cardId: c.id, text: c.front })),
      defs: shuffle(group.map((c) => ({ cardId: c.id, text: c.back }))),
    });
  }
  return rounds;
}

// ---------- AI topic string ----------

/** Turn a set's cards into a compact prompt for the AI study-guide server fn. */
export function cardsToTopic(title: string, cards: readonly StudyCard[], max = 3500): string {
  let out = title ? `${title}\n\n` : "";
  for (const c of usableCards(cards)) {
    const line = `- ${c.front}: ${c.back}\n`;
    if (out.length + line.length > max) break;
    out += line;
  }
  return out.trim();
}
