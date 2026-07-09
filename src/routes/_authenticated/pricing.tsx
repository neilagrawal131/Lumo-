import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, Crown } from "lucide-react";
import { createCheckoutSession } from "@/lib/billing.functions";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { FREE_FEATURES, PREMIUM_FEATURES, PRICING, isPremium } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const { data: profile } = useProfile();
  const checkout = useServerFn(createCheckoutSession);
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const premium = isPremium(profile?.plan);

  async function upgrade() {
    setLoading(true);
    try {
      const { url } = await checkout({ data: { interval, origin: window.location.origin } });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout");
      setLoading(false);
    }
  }

  const price = PRICING[interval];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold">
          <Crown className="h-7 w-7 text-warning" /> Etude Premium
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Unlock unlimited AI study tools. Start with a <span className="font-medium text-foreground">7-day free trial</span> — cancel anytime.
        </p>
      </div>

      {/* Billing interval toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {(["monthly", "yearly"] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                interval === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {i === "monthly" ? "Monthly" : "Yearly"}
              {i === "yearly" && <span className="ml-1 text-xs opacity-80">(save 33%)</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-2 text-3xl font-bold">$0<span className="text-base font-normal text-muted-foreground">/forever</span></p>
          <ul className="mt-6 space-y-3 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-8 w-full" disabled>
            {premium ? "Included" : "Your current plan"}
          </Button>
        </div>

        {/* Premium */}
        <div className="relative rounded-3xl border-2 border-primary bg-card p-8 shadow-elegant">
          <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">
            Most popular
          </span>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" /> Premium
          </h2>
          <p className="mt-2 text-3xl font-bold">
            {price.amount}
            <span className="text-base font-normal text-muted-foreground">{price.per}</span>
          </p>
          <p className="text-xs text-muted-foreground">{price.note}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
              </li>
            ))}
          </ul>
          {premium ? (
            <Button asChild variant="hero" className="mt-8 w-full">
              <Link to="/billing">Manage subscription</Link>
            </Button>
          ) : (
            <Button variant="hero" size="lg" className="mt-8 w-full" onClick={upgrade} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Start 7-day free trial
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2 text-center text-xs text-muted-foreground">
        <p>
          After your 7-day free trial, Premium automatically continues at{" "}
          <span className="font-medium text-foreground">{price.amount}{price.per}</span> and renews
          automatically each {interval === "monthly" ? "month" : "year"} until you cancel. Cancel
          anytime from your billing page before the trial ends and you won't be charged. Secure
          checkout by Stripe.
        </p>
        <p>
          By starting your trial, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link> and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
