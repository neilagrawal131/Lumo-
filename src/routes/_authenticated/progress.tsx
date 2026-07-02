import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";
import { Flame, Trophy, Layers, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { BADGES, levelProgress, xpIntoLevel, XP_PER_LEVEL } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const { data: stats } = useQuery({
    queryKey: ["progress-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [sessions, attempts, sets, quizzes, badges] = await Promise.all([
        supabase.from("study_sessions").select("xp_earned, created_at").order("created_at", { ascending: false }).limit(200),
        supabase.from("quiz_attempts").select("score, total, created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("flashcard_sets").select("id", { count: "exact", head: true }),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
        supabase.from("badges").select("badge_key"),
      ]);
      return {
        sessions: sessions.data ?? [],
        attempts: attempts.data ?? [],
        setCount: sets.count ?? 0,
        quizCount: quizzes.count ?? 0,
        badges: (badges.data ?? []).map((b) => b.badge_key),
      };
    },
  });

  const days = Array.from({ length: 14 }, (_, k) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - k));
    return { key: d.toISOString().slice(0, 10), label: d.getDate().toString() };
  });
  const chart = days.map((d) => ({
    label: d.label,
    xp: (stats?.sessions ?? []).filter((s) => s.created_at.slice(0, 10) === d.key).reduce((a, s) => a + (s.xp_earned ?? 0), 0),
  }));
  const avgScore = stats && stats.attempts.length
    ? Math.round((stats.attempts.reduce((a, x) => a + (x.total ? x.score / x.total : 0), 0) / stats.attempts.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Your progress</h1>
        <p className="mt-1 text-muted-foreground">Track your learning journey, streaks and achievements.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Flame} tint="bg-warning/15 text-warning" value={`${profile?.current_streak ?? 0}`} label="Day streak" />
        <Stat icon={Trophy} tint="bg-primary/10 text-primary" value={`${profile?.xp ?? 0}`} label="Total XP" />
        <Stat icon={Layers} tint="bg-secondary/15 text-secondary" value={`${stats?.setCount ?? 0}`} label="Flashcard sets" />
        <Stat icon={ClipboardList} tint="bg-accent/15 text-accent" value={`${avgScore}%`} label="Avg quiz score" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">XP — last 14 days</h2>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 }} />
              <Bar dataKey="xp" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Level {profile?.level ?? 1}</h2>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-brand" style={{ width: `${levelProgress(profile?.xp ?? 0)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{xpIntoLevel(profile?.xp ?? 0)} / {XP_PER_LEVEL} XP to next level · Longest streak: {profile?.longest_streak ?? 0} days</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Recent quiz attempts</h2>
          <div className="mt-3 space-y-2">
            {stats && stats.attempts.length > 0 ? (
              stats.attempts.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                  <span className="font-medium">{a.score}/{a.total}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Achievements</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BADGES.map((b) => {
            const earned = stats?.badges.includes(b.key);
            return (
              <div key={b.key} className={`rounded-2xl border p-4 text-center ${earned ? "border-warning/40 bg-warning/5" : "border-border opacity-50"}`}>
                <div className={`text-3xl ${earned ? "" : "grayscale"}`}>{b.emoji}</div>
                <div className="mt-2 text-sm font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">{b.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, tint, value, label }: { icon: React.ElementType; tint: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
