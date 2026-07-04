import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/oauth/callback")({
  ssr: false,
  component: AuthCallback,
});

// Handles the redirect back from an OAuth provider (e.g. Google). The Supabase
// client auto-detects the auth code / token in the URL and establishes the
// session; we just wait for it, then send the user on to their dashboard.
function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Surface any provider error passed back in the URL (query or hash).
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const providerError =
      url.searchParams.get("error_description") ||
      url.searchParams.get("error") ||
      hash.get("error_description") ||
      hash.get("error");

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      navigate({ to: "/dashboard" });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) done();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) done();
    });

    const timeout = setTimeout(() => {
      if (!settled) setError(providerError || "Sign-in didn't complete. Please try again.");
    }, 5000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Couldn't finish sign-in</h1>
        <p className="max-w-md text-muted-foreground">{error}</p>
        <Button asChild variant="hero"><Link to="/auth" search={{ mode: "login" }}>Back to sign in</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">Signing you in…</p>
    </div>
  );
}
