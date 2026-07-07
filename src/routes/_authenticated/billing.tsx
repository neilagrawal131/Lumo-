import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, Loader2, CreditCard, Sparkles, ArrowRight } from "lucide-react";
import { syncSubscription, createPortalSession } from "@/lib/billing.functions";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { isPremium } from "@/lib/plans";

const searchSchema = (s: Record<string, unknown>): { checkout?: string } =>
  typeof s.checkout === "string" ? { checkout: s.checkout } : {};

export const Route = createFileRoute("/_authenticated/billing")({
  validateSearch: searchSchema,
  component: BillingPage,
});

function BillingPage() {
  const { checkout } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const sync = useServerFn(syncSubscription);
  const portal = useServerFn(createPortalSession);
  const [portalLoading, setPortalLoading] = useState(false);

  // Pull the latest subscription state from Stripe on load (and after checkout).
  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await sync({});
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      return res;
    },
  });

  useEffect(() => {
    if (checkout === "success") {
      toast.success("You're on Premium! 🎉 Enjoy your free trial.");
      navigate({ to: "/billing", search: {}, replace: true });
    }
  }, [checkout, navigate]);

  const premium = isPremium(sub?.plan ?? profile?.plan);

  async function manage() {
    setPortalLoading(true);
    try {
      const { url } = await portal({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open billing portal");
      setPortalLoading(false);
    }
  }

  const renews = sub?.renewsAt ?? profile?.plan_renews_at;
  const renewsText = renews ? new Date(renews).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold">
        <CreditCard className="h-7 w-7 text-primary" /> Billing
      </h1>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        {isLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Checking your plan…
          </div>
        ) : premium ? (
          <>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-warning" />
              <span className="text-xl font-bold">Premium</span>
              {sub?.status === "trialing" && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Free trial</span>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">
              {sub?.status === "trialing" ? "Your free trial is active." : "Your subscription is active."}
              {renewsText && ` ${sub?.status === "trialing" ? "Trial ends" : "Renews"} ${renewsText}.`}
            </p>
            <Button variant="hero" className="mt-6" onClick={manage} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Manage subscription
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Update your card, view invoices, switch monthly/yearly, or cancel — all in the secure Stripe portal.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">Free plan</span>
            </div>
            <p className="mt-2 text-muted-foreground">
              You're on the free plan. Upgrade to Premium for unlimited AI study tools and a 7-day free trial.
            </p>
            <Button asChild variant="hero" className="mt-6">
              <Link to="/pricing"><Sparkles className="h-4 w-4" /> See Premium <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
