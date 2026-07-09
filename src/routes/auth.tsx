import { useState } from "react";
import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGE_GROUPS, type AgeGroup } from "@/lib/gamification";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).default("login").catch("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 4.75 12 4.75Z" />
  </svg>
);

// Flip to true once Google OAuth is configured in Supabase.
const GOOGLE_ENABLED = false;

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email or password isn't right. Try again, or reset your password.";
  if (m.includes("already registered") || m.includes("already been registered")) return "You already have an account with this email — try logging in instead.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("password should be at least")) return "Your password needs to be at least 6 characters.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "Google sign-in isn't switched on for this site yet.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts — please wait a minute and try again.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) return "New sign-ups are currently disabled for this site.";
  return message;
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("college");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/oauth/callback`,
            data: { display_name: name || email.split("@")[0], age_group: ageGroup },
          },
        });
        if (error) throw error;
        // If the project requires email confirmation, no session is returned yet.
        if (!data.session) {
          setEmailSent(true);
          return;
        }
        toast.success("Welcome to Etude! 🎉");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(friendlyAuthError(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      // Supabase-native OAuth: redirects the browser to Google, then back to
      // /oauth/callback. Works on any host (no dependency on Lovable's platform).
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/oauth/callback` },
      });
      if (error) throw error;
      // On success the browser navigates away to Google; nothing else runs here.
    } catch (err) {
      toast.error(friendlyAuthError(err instanceof Error ? err.message : "Google sign-in failed"));
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent — check your email.");
    } catch (err) {
      toast.error(friendlyAuthError(err instanceof Error ? err.message : "Couldn't send the reset email"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-hero p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">📖</span>
            Etude
          </Link>
        </div>
        <div className="relative z-10 max-w-md text-primary-foreground">
          <h2 className="text-4xl font-bold leading-tight">Study less. Remember more.</h2>
          <p className="mt-4 text-primary-foreground/90">
            AI flashcards, quizzes and study guides that adapt to you — with streaks and badges to keep you going.
          </p>
        </div>
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup ? "Start learning smarter in seconds." : "Log in to continue your streak."}
          </p>

          {emailSent ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
              <div className="text-4xl">📬</div>
              <h2 className="mt-3 text-lg font-semibold">Confirm your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Click it to activate your account, then come back and log in.
              </p>
              <Button variant="soft" className="mt-5 w-full" onClick={() => setEmailSent(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
          <>
          {GOOGLE_ENABLED && (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="mt-6 w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                <GoogleIcon /> Continue with Google
              </Button>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or {isSignup ? "sign up" : "log in"} with email <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className={GOOGLE_ENABLED ? "space-y-4" : "mt-6 space-y-4"}>
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignup && (
                  <button type="button" onClick={handleForgotPassword} className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {isSignup && (
              <div className="space-y-2">
                <Label>I'm a…</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AGE_GROUPS.map((g) => (
                    <button
                      type="button"
                      key={g.value}
                      onClick={() => setAgeGroup(g.value)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        ageGroup === g.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-lg">{g.emoji}</div>
                      <div className="text-sm font-medium">{g.label}</div>
                      <div className="text-xs text-muted-foreground">{g.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? "Create account" : "Log in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
          </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "New to Etude? "}
            <Link
              to="/auth"
              search={{ mode: isSignup ? "login" : "signup" }}
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? "Log in" : "Sign up free"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
