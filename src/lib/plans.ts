// Plan metadata shared by the pricing page, billing page, and gating logic.

export const FREE_SET_LIMIT = 10;

export const PRICING = {
  monthly: { amount: "$9.99", per: "/month", note: "Billed monthly" },
  yearly: { amount: "$79.99", per: "/year", note: "Billed yearly — save 33%" },
} as const;

export const FREE_FEATURES: string[] = [
  "Up to 10 study sets",
  "Basic AI generation",
  "Flashcards & quizzes",
  "Limited document uploads",
  "Progress tracking & streaks",
];

export const PREMIUM_FEATURES: string[] = [
  "Unlimited study sets, flashcards & quizzes",
  "Unlimited AI generations",
  "Unlimited document uploads",
  "AI tutor with detailed explanations",
  "AI summaries, study guides & study plans",
  "Spaced repetition & advanced analytics",
  "Priority AI processing — no ads",
  "Early access to new features",
];

export type Plan = "free" | "premium";

export function isPremium(plan: string | null | undefined): boolean {
  return plan === "premium";
}
