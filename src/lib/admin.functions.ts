import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin actions require SUPABASE_SERVICE_ROLE_KEY (server-only) and re-verify
// the caller's admin role from the database on every call.
type Ctx = { supabase: any; userId: string; claims: Record<string, unknown> };

// Verify — from the database, not the client — that the caller is an admin.
async function requireAdmin(context: Ctx): Promise<void> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .single();
  if (data?.role !== "admin") throw new Error("Forbidden: admin access required.");
}

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------- List / search users ----------
export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const db = await adminDb();

    const { data: authList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name, age_group, xp, level, current_streak, longest_streak, last_study_date, plan, subscription_status, plan_renews_at, suspended");
    const { data: roles } = await db.from("user_roles").select("user_id, role");

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const rMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));

    let users = (authList?.users ?? []).map((u: any) => {
      const p: any = pMap.get(u.id) ?? {};
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        display_name: p.display_name ?? null,
        xp: p.xp ?? 0,
        level: p.level ?? 1,
        current_streak: p.current_streak ?? 0,
        longest_streak: p.longest_streak ?? 0,
        last_study_date: p.last_study_date ?? null,
        plan: p.plan ?? "free",
        subscription_status: p.subscription_status ?? null,
        plan_renews_at: p.plan_renews_at ?? null,
        suspended: p.suspended ?? false,
        role: rMap.get(u.id) ?? "user",
      };
    });

    const q = data.search?.trim().toLowerCase();
    if (q) {
      users = users.filter(
        (u) => (u.email ?? "").toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q),
      );
    }
    users.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { users };
  });

// ---------- Promote / demote ----------
export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["user", "admin"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    if (data.role === "user" && data.userId === (context as Ctx).userId) {
      throw new Error("You can't remove your own admin role.");
    }
    const db = await adminDb();
    await db.from("user_roles").upsert({ user_id: data.userId, role: data.role });
    return { ok: true };
  });

// ---------- Suspend / restore ----------
export const adminSuspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), suspended: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    if (data.userId === (context as Ctx).userId) throw new Error("You can't suspend your own account.");
    const db = await adminDb();
    await db.from("profiles").update({ suspended: data.suspended }).eq("id", data.userId);
    return { ok: true };
  });

// ---------- Delete account ----------
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    if (data.userId === (context as Ctx).userId) throw new Error("You can't delete your own account here.");
    const db = await adminDb();
    await db.auth.admin.deleteUser(data.userId);
    return { ok: true };
  });

// ---------- Platform analytics ----------
export const adminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const db = await adminDb();

    const countOf = async (table: string, build?: (q: any) => any) => {
      let q = db.from(table).select("*", { count: "exact", head: true });
      if (build) q = build(q);
      const { count } = await q;
      return count ?? 0;
    };

    const [totalUsers, premiumUsers, totalSets, totalQuizzes, dau, wau, mau, newToday, newWeek, newMonth] =
      await Promise.all([
        countOf("profiles"),
        countOf("profiles", (q) => q.eq("plan", "premium")),
        countOf("flashcard_sets"),
        countOf("quizzes"),
        countOf("profiles", (q) => q.gte("last_study_date", daysAgo(0))),
        countOf("profiles", (q) => q.gte("last_study_date", daysAgo(7))),
        countOf("profiles", (q) => q.gte("last_study_date", daysAgo(30))),
        countOf("profiles", (q) => q.gte("created_at", daysAgo(0))),
        countOf("profiles", (q) => q.gte("created_at", daysAgo(7))),
        countOf("profiles", (q) => q.gte("created_at", daysAgo(30))),
      ]);

    // Popular subjects
    const { data: subjRows } = await db.from("flashcard_sets").select("subject").not("subject", "is", null).limit(5000);
    const tally = new Map<string, number>();
    for (const r of subjRows ?? []) {
      const s = (r.subject as string)?.trim();
      if (s) tally.set(s, (tally.get(s) ?? 0) + 1);
    }
    const popularSubjects = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([subject, count]) => ({ subject, count }));

    return {
      totalUsers, premiumUsers, freeUsers: totalUsers - premiumUsers,
      totalSets, totalQuizzes,
      dau, wau, mau,
      newToday, newWeek, newMonth,
      popularSubjects,
    };
  });

// ---------- Leaderboards ----------
export const adminLeaderboards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const db = await adminDb();

    const { data: topXp } = await db
      .from("profiles").select("id, display_name, xp, level").order("xp", { ascending: false }).limit(10);
    const { data: topStreak } = await db
      .from("profiles").select("id, display_name, current_streak, longest_streak").order("current_streak", { ascending: false }).limit(10);

    // Quiz performance — average score % per user
    const { data: attempts } = await db.from("quiz_attempts").select("user_id, score, total").limit(10000);
    const agg = new Map<string, { correct: number; total: number; n: number }>();
    for (const a of attempts ?? []) {
      const cur = agg.get(a.user_id) ?? { correct: 0, total: 0, n: 0 };
      cur.correct += a.score ?? 0;
      cur.total += a.total ?? 0;
      cur.n += 1;
      agg.set(a.user_id, cur);
    }
    const { data: names } = await db.from("profiles").select("id, display_name");
    const nameMap = new Map((names ?? []).map((n: any) => [n.id, n.display_name]));
    const topQuiz = [...agg.entries()]
      .filter(([, v]) => v.total > 0 && v.n >= 1)
      .map(([id, v]) => ({ id, display_name: nameMap.get(id) ?? "—", pct: Math.round((v.correct / v.total) * 100), attempts: v.n }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10);

    return { topXp: topXp ?? [], topStreak: topStreak ?? [], topQuiz };
  });
