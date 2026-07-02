import { supabase } from "@/integrations/supabase/client";
import { levelFromXp, BADGES } from "./gamification";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string) {
  const d1 = new Date(a + "T00:00:00Z").getTime();
  const d2 = new Date(b + "T00:00:00Z").getTime();
  return Math.round((d2 - d1) / 86400000);
}

export async function awardBadge(userId: string, key: string) {
  await supabase.from("badges").insert({ user_id: userId, badge_key: key }).select().maybeSingle();
}

export type ActivityResult = {
  xpEarned: number;
  newLevel: number;
  leveledUp: boolean;
  newBadges: string[];
  streak: number;
};

/**
 * Record a study activity: award XP, update streak, log a session, and grant badges.
 */
export async function recordActivity(
  userId: string,
  kind: string,
  detail: string,
  xp: number,
): Promise<ActivityResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, level, current_streak, longest_streak, last_study_date")
    .eq("id", userId)
    .single();

  const today = todayStr();
  let streak = profile?.current_streak ?? 0;
  const last = profile?.last_study_date ?? null;
  if (!last) streak = 1;
  else {
    const diff = daysBetween(last, today);
    if (diff === 0) streak = Math.max(streak, 1);
    else if (diff === 1) streak += 1;
    else streak = 1;
  }

  const prevXp = profile?.xp ?? 0;
  const prevLevel = profile?.level ?? 1;
  const newXp = prevXp + xp;
  const newLevel = levelFromXp(newXp);
  const longest = Math.max(profile?.longest_streak ?? 0, streak);

  await supabase
    .from("profiles")
    .update({
      xp: newXp,
      level: newLevel,
      current_streak: streak,
      longest_streak: longest,
      last_study_date: today,
    })
    .eq("id", userId);

  await supabase.from("study_sessions").insert({ user_id: userId, kind, detail, xp_earned: xp });

  // Badge checks
  const { data: existing } = await supabase.from("badges").select("badge_key").eq("user_id", userId);
  const owned = new Set((existing ?? []).map((b) => b.badge_key));
  const { count: sessionCount } = await supabase
    .from("study_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const candidates: string[] = [];
  if (streak >= 3) candidates.push("streak_3");
  if (streak >= 7) candidates.push("streak_7");
  if (newXp >= 1000) candidates.push("xp_1000");
  if (newLevel >= 5) candidates.push("level_5");
  if ((sessionCount ?? 0) >= 10) candidates.push("night_owl");

  const newBadges: string[] = [];
  for (const key of candidates) {
    if (!owned.has(key) && BADGES.some((b) => b.key === key)) {
      await awardBadge(userId, key);
      newBadges.push(key);
    }
  }

  return {
    xpEarned: xp,
    newLevel,
    leveledUp: newLevel > prevLevel,
    newBadges,
    streak,
  };
}
