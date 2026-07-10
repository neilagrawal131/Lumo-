import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  Layers,
  ClipboardList,
  BookOpen,
  Plus,
  Trophy,
  Target,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { OnboardingTour } from "@/components/OnboardingTour";
import { BADGES, levelProgress, xpIntoLevel, XP_PER_LEVEL } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function last7Days() {
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en", { weekday: "short" }) });
  }
  return days;
}

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const { data: sets } = useQuery({
    queryKey: ["sets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("flashcard_sets")
        .select("id, title, topic, difficulty, created_at")
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["quizzes-recent", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, difficulty, created_at")
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions-week", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data } = await supabase
        .from("study_sessions")
        .select("xp_earned, created_at")
        .gte("created_at", since.toISOString());
      return data ?? [];
    },
  });

  const { data: badges } = useQuery({
    queryKey: ["badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("badges").select("badge_key");
      return (data ?? []).map((b) => b.badge_key);
    },
  });

  const days = last7Days();
  const chartData = days.map((d) => ({
    label: d.label,
    xp: (sessions ?? [])
      .filter((s) => s.created_at.slice(0, 10) === d.key)
      .reduce((acc, s) => acc + (s.xp_earned ?? 0), 0),
  }));
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayXp = chartData[chartData.length - 1]?.xp ?? 0;
  const dailyGoal = 100;
  const goalPct = Math.min(100, Math.round((todayXp / dailyGoal) * 100));
  const studiedToday = profile?.last_study_date === todayKey;

  return (
    <div className="space-y-8">
      {user && <OnboardingTour userId={user.id} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Hi {profile?.display_name ?? "there"} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            {studiedToday ? "Great work today — keep the momentum going!" : "Ready to learn something new today?"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="hero">
            <Link to="/flashcards">
              <Plus className="h-4 w-4" /> New Flashcards
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/quizzes">
              <Plus className="h-4 w-4" /> New Quiz
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Flame} tint="warning" label="Current streak" value={`${profile?.current_streak ?? 0} days`} sub={`Best: ${profile?.longest_streak ?? 0}`} />
        <StatCard icon={Trophy} tint="primary" label="Total XP" value={`${profile?.xp ?? 0}`} sub={`Level ${profile?.level ?? 1}`} />
        <StatCard icon={Layers} tint="secondary" label="Flashcard sets" value={`${sets?.length ?? 0}`} sub="Recent" />
        <StatCard icon={ClipboardList} tint="accent" label="Quizzes" value={`${quizzes?.length ?? 0}`} sub="Recent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><TrendingUp className="h-5 w-5 text-primary" /> This week's XP</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="xp" stroke="var(--primary)" strokeWidth={2.5} fill="url(#xpFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's goal + level */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold"><Target className="h-5 w-5 text-accent" /> Today's goal</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke="var(--accent)" strokeWidth="3.5"
                    strokeDasharray={`${goalPct}, 100`} strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{goalPct}%</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{todayXp} / {dailyGoal} XP</p>
                <p>Earn XP by studying cards and taking quizzes.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold">Level {profile?.level ?? 1}</h2>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-brand" style={{ width: `${levelProgress(profile?.xp ?? 0)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {xpIntoLevel(profile?.xp ?? 0)} / {XP_PER_LEVEL} XP to level {(profile?.level ?? 1) + 1}
            </p>
          </div>
        </div>
      </div>

      {/* Recent + recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentList
          title="Recent study sets"
          icon={Layers}
          empty="No sets yet — create your first!"
          emptyTo="/sets"
          items={(sets ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            sub: s.difficulty,
            to: "/study/$setId",
            params: { setId: s.id },
          }))}
        />
        <RecentList
          title="Recent quizzes"
          icon={ClipboardList}
          empty="No quizzes yet — generate one!"
          emptyTo="/quizzes"
          items={(quizzes ?? []).map((q) => ({ id: q.id, title: q.title, sub: q.difficulty, to: "/quizzes" as const }))}
        />
      </div>

      {/* Recommended + badges */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-5 w-5 text-primary" /> Recommended for you</h2>
          <div className="mt-4 space-y-3">
            {["Review your due flashcards", "Take a quick 5-question quiz", "Generate a study guide for a tricky topic"].map((r, i) => (
              <Link
                key={i}
                to={i === 2 ? "/study-guide" : i === 1 ? "/quizzes" : "/flashcards"}
                className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {i === 2 ? <BookOpen className="h-5 w-5" /> : i === 1 ? <ClipboardList className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
                </span>
                <span className="text-sm font-medium">{r}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold"><Trophy className="h-5 w-5 text-warning" /> Badges</h2>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {BADGES.map((b) => {
              const earned = badges?.includes(b.key);
              return (
                <div key={b.key} className="text-center" title={`${b.name}: ${b.description}`}>
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${earned ? "bg-warning/15" : "bg-muted opacity-40 grayscale"}`}>
                    {b.emoji}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-muted-foreground">{b.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tint }: { icon: React.ElementType; label: string; value: string; sub: string; tint: string }) {
  const tints: Record<string, string> = {
    warning: "bg-warning/15 text-warning",
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/15 text-secondary",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tints[tint]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function RecentList({
  title,
  icon: Icon,
  items,
  empty,
  emptyTo,
}: {
  title: string;
  icon: React.ElementType;
  items: { id: string; title: string; sub: string; to: string; params?: Record<string, string> }[];
  empty: string;
  emptyTo: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-primary" /> {title}</h2>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <Link to={emptyTo as never} className="block rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:border-primary/40">
            {empty}
          </Link>
        ) : (
          items.map((it) => (
            <Link key={it.id} to={it.to as never} params={it.params as never} className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted">
              <span className="truncate text-sm font-medium">{it.title}</span>
              <span className="ml-2 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{it.sub}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
