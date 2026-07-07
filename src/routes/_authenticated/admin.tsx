import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Shield, Users, Crown, Search, Loader2, TrendingUp, Trophy, Flame,
  ShieldCheck, ShieldOff, Ban, RotateCcw, Trash2, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListUsers, adminSetRole, adminSuspendUser, adminDeleteUser, adminStats, adminLeaderboards,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "login" } });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (data?.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const listUsers = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetRole);
  const suspend = useServerFn(adminSuspendUser);
  const del = useServerFn(adminDeleteUser);
  const getStats = useServerFn(adminStats);
  const getBoards = useServerFn(adminLeaderboards);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => listUsers({ data: {} }),
  });
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: async () => getStats({}) });
  const { data: boards } = useQuery({ queryKey: ["admin-boards"], queryFn: async () => getBoards({}) });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  async function act(id: string, fn: () => Promise<unknown>, okMsg: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(okMsg);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const q = search.trim().toLowerCase();
  const users = (usersData?.users ?? []).filter(
    (u) => !q || (u.email ?? "").toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Shield className="h-7 w-7 text-primary" /> Admin Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">Manage users, subscriptions, and view platform analytics.</p>
      </div>

      {/* Analytics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Total users" value={stats?.totalUsers} sub={`${stats?.premiumUsers ?? 0} premium · ${stats?.freeUsers ?? 0} free`} />
        <Stat icon={TrendingUp} label="Active users" value={stats?.mau} sub={`${stats?.dau ?? 0} today · ${stats?.wau ?? 0} this week`} />
        <Stat icon={Crown} label="New sign-ups" value={stats?.newWeek} sub={`${stats?.newToday ?? 0} today · ${stats?.newMonth ?? 0} this month`} />
        <Stat icon={BookOpen} label="Content" value={stats?.totalSets} sub={`${stats?.totalSets ?? 0} sets · ${stats?.totalQuizzes ?? 0} quizzes`} />
      </div>

      {/* Users */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 text-primary" /> User management</h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
          </div>
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">User</th>
                  <th className="px-3">Role</th>
                  <th className="px-3">Plan</th>
                  <th className="px-3">XP / Lvl</th>
                  <th className="px-3">Streak</th>
                  <th className="px-3">Status</th>
                  <th className="px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/60">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{u.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.plan === "premium" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {u.plan}
                      </span>
                      {u.subscription_status === "trialing" && <div className="mt-0.5 text-[10px] text-muted-foreground">trial</div>}
                    </td>
                    <td className="px-3 text-muted-foreground">{u.xp} · L{u.level}</td>
                    <td className="px-3 text-muted-foreground">{u.current_streak}d</td>
                    <td className="px-3">
                      {u.suspended
                        ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">Suspended</span>
                        : <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Active</span>}
                    </td>
                    <td className="px-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.role === "admin" ? (
                          <IconBtn title="Demote to user" disabled={busy === u.id} onClick={() => act(u.id, () => setRole({ data: { userId: u.id, role: "user" } }), "Role updated")}><ShieldOff className="h-4 w-4" /></IconBtn>
                        ) : (
                          <IconBtn title="Promote to admin" disabled={busy === u.id} onClick={() => act(u.id, () => setRole({ data: { userId: u.id, role: "admin" } }), "Role updated")}><ShieldCheck className="h-4 w-4" /></IconBtn>
                        )}
                        {u.suspended ? (
                          <IconBtn title="Restore account" disabled={busy === u.id} onClick={() => act(u.id, () => suspend({ data: { userId: u.id, suspended: false } }), "Account restored")}><RotateCcw className="h-4 w-4" /></IconBtn>
                        ) : (
                          <IconBtn title="Suspend account" disabled={busy === u.id} onClick={() => act(u.id, () => suspend({ data: { userId: u.id, suspended: true } }), "Account suspended")}><Ban className="h-4 w-4" /></IconBtn>
                        )}
                        <IconBtn
                          title="Delete account"
                          danger
                          disabled={busy === u.id}
                          onClick={() => {
                            if (confirm(`Permanently delete ${u.email}? This cannot be undone.`)) {
                              act(u.id, () => del({ data: { userId: u.id } }), "Account deleted");
                            }
                          }}
                        ><Trash2 className="h-4 w-4" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No users match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Popular subjects + leaderboards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most popular subjects" icon={BookOpen}>
          {(stats?.popularSubjects ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats!.popularSubjects.map((s) => (
                <li key={s.subject} className="flex items-center justify-between text-sm">
                  <span>{s.subject}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.count} sets</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top learners (XP)" icon={Trophy}>
          <Board rows={(boards?.topXp ?? []).map((u: any) => ({ name: u.display_name ?? "—", value: `${u.xp} XP · L${u.level}` }))} />
        </Panel>

        <Panel title="Longest streaks" icon={Flame}>
          <Board rows={(boards?.topStreak ?? []).map((u: any) => ({ name: u.display_name ?? "—", value: `${u.current_streak} days` }))} />
        </Panel>

        <Panel title="Top quiz performance" icon={Trophy}>
          <Board rows={(boards?.topQuiz ?? []).map((u: any) => ({ name: u.display_name ?? "—", value: `${u.pct}% · ${u.attempts} quizzes` }))} />
        </Panel>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value?: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-2xl font-bold">{value ?? "—"}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-primary" /> {title}</h2>
      {children}
    </div>
  );
}

function Board({ rows }: { rows: { name: string; value: string }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
            {r.name}
          </span>
          <span className="text-xs text-muted-foreground">{r.value}</span>
        </li>
      ))}
    </ol>
  );
}

function IconBtn({ title, onClick, disabled, danger, children }: { title: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors disabled:opacity-40 ${
        danger ? "text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
