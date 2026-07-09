import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Library,
  Layers,
  ClipboardList,
  BookOpen,
  Trophy,
  Users,
  Crown,
  Shield,
  Flame,
  LifeBuoy,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { levelProgress, xpIntoLevel, XP_PER_LEVEL } from "@/lib/gamification";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sets", label: "Study Sets", icon: Library },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/quizzes", label: "Quizzes", icon: ClipboardList },
  { to: "/study-guide", label: "Study Guide", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: Trophy },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/pricing", label: "Premium", icon: Crown },
  { to: "/help", label: "Help", icon: LifeBuoy },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const { data: role } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const navItems = role === "admin" ? [...nav, { to: "/admin", label: "Admin", icon: Shield } as const] : nav;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand text-primary-foreground shadow-elegant"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-soft">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border/60 bg-card p-4 lg:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>
        <div className="mt-6 flex-1">
          <NavLinks />
        </div>
        <ProfileCard profile={profile} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-card/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <StreakPill streak={profile?.current_streak ?? 0} />
          <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 top-16 z-40 bg-card p-4 lg:hidden">
          <NavLinks />
          <div className="mt-4">
            <ProfileCard profile={profile} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        {/* Desktop top bar */}
        <div className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-3 border-b border-border/60 bg-background/70 px-6 backdrop-blur lg:flex">
          <StreakPill streak={profile?.current_streak ?? 0} />
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Trophy className="h-4 w-4" /> {profile?.xp ?? 0} XP
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );

  function ProfileCard({ profile }: { profile: ReturnType<typeof useProfile>["data"] }) {
    const initial = (profile?.display_name ?? "L")[0].toUpperCase();
    return (
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-semibold text-primary-foreground">
            {initial}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{profile?.display_name ?? "Learner"}</div>
            <div className="text-xs text-muted-foreground">Level {profile?.level ?? 1}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-brand" style={{ width: `${levelProgress(profile?.xp ?? 0)}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {xpIntoLevel(profile?.xp ?? 0)} / {XP_PER_LEVEL} XP to next level
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mt-3 w-full justify-start text-muted-foreground lg:hidden" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    );
  }
}

function StreakPill({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 text-sm font-semibold text-warning-foreground">
      <Flame className="h-4 w-4 text-warning" /> {streak}
    </div>
  );
}
