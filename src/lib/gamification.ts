export const XP_PER_LEVEL = 250;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
export function xpIntoLevel(xp: number): number {
  return xp % XP_PER_LEVEL;
}
export function levelProgress(xp: number): number {
  return Math.round((xpIntoLevel(xp) / XP_PER_LEVEL) * 100);
}

export type BadgeDef = {
  key: string;
  name: string;
  description: string;
  emoji: string;
};

export const BADGES: BadgeDef[] = [
  { key: "first_set", name: "First Steps", description: "Created your first flashcard set", emoji: "🎯" },
  { key: "first_quiz", name: "Quiz Rookie", description: "Completed your first quiz", emoji: "📝" },
  { key: "perfect_quiz", name: "Perfectionist", description: "Scored 100% on a quiz", emoji: "💯" },
  { key: "streak_3", name: "On a Roll", description: "3-day learning streak", emoji: "🔥" },
  { key: "streak_7", name: "Week Warrior", description: "7-day learning streak", emoji: "⚡" },
  { key: "xp_1000", name: "Scholar", description: "Earned 1,000 XP", emoji: "🎓" },
  { key: "level_5", name: "Rising Star", description: "Reached level 5", emoji: "⭐" },
  { key: "night_owl", name: "Dedicated", description: "Studied 10 sessions", emoji: "🦉" },
];

export const AGE_GROUPS = [
  { value: "kids", label: "Kids (under 13)", emoji: "🧸", blurb: "Colorful, playful & simple" },
  { value: "teens", label: "Teens (13–17)", emoji: "🎧", blurb: "Modern & interactive" },
  { value: "college", label: "College (18–24)", emoji: "📚", blurb: "Productivity focused" },
  { value: "adults", label: "Adults (25+)", emoji: "💼", blurb: "Clean & professional" },
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number]["value"];
