import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { stripeFetch } from "./stripe.server";

type AuthCtx = {
  supabase: {
    from: (t: string) => any;
  };
  userId: string;
  claims: Record<string, unknown>;
};

async function getOrCreateCustomer(ctx: AuthCtx): Promise<string> {
  const { supabase, userId, claims } = ctx;
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, display_name")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripeFetch("/customers", "POST", {
    email: typeof claims.email === "string" ? claims.email : undefined,
    name: profile?.display_name || undefined,
    "metadata[user_id]": userId,
  });

  await supabase.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}

// ---------- Start a subscription checkout ----------
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ interval: z.enum(["monthly", "yearly"]), origin: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Price IDs default to the (non-secret) sandbox prices; override via env for live mode.
    const price =
      data.interval === "yearly"
        ? process.env.STRIPE_PRICE_YEARLY || "price_1Tqax5FHfxTJm8H2QhMKw48y"
        : process.env.STRIPE_PRICE_MONTHLY || "price_1TqawXFHfxTJm8H2PtLki1Vg";
    if (!price) throw new Error("Billing isn't set up yet. Please try again later.");

    const customer = await getOrCreateCustomer(context as unknown as AuthCtx);
    const session = await stripeFetch("/checkout/sessions", "POST", {
      mode: "subscription",
      customer,
      "line_items[0][price]": price,
      "line_items[0][quantity]": 1,
      "subscription_data[trial_period_days]": 7,
      allow_promotion_codes: true,
      success_url: `${data.origin}/billing?checkout=success`,
      cancel_url: `${data.origin}/pricing?checkout=cancel`,
    });
    return { url: session.url as string };
  });

// ---------- Open the Stripe customer portal (manage/cancel/billing history) ----------
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as AuthCtx;
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();
    if (!profile?.stripe_customer_id) throw new Error("No billing account yet — start a plan first.");

    const session = await stripeFetch("/billing_portal/sessions", "POST", {
      customer: profile.stripe_customer_id,
      return_url: `${data.origin}/billing`,
    });
    return { url: session.url as string };
  });

// ---------- Sync the user's plan from Stripe into their profile ----------
export const syncSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as AuthCtx;
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) {
      return { plan: "free" as const, status: null, renewsAt: null, interval: null };
    }

    const subs = await stripeFetch("/subscriptions", "GET", {
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 5,
    });

    const list: any[] = Array.isArray(subs.data) ? subs.data : [];
    const active = list.find((s) => ["active", "trialing", "past_due"].includes(s.status));

    let plan: "free" | "premium" = "free";
    let status: string | null = null;
    let renewsAt: string | null = null;
    let interval: string | null = null;
    let subscriptionId: string | null = null;

    if (active) {
      status = active.status;
      subscriptionId = active.id;
      plan = status === "active" || status === "trialing" ? "premium" : "free";
      renewsAt = active.current_period_end
        ? new Date(active.current_period_end * 1000).toISOString()
        : null;
      interval = active.items?.data?.[0]?.price?.recurring?.interval ?? null;
    }

    await supabase
      .from("profiles")
      .update({
        plan,
        subscription_status: status,
        plan_renews_at: renewsAt,
        stripe_subscription_id: subscriptionId,
      })
      .eq("id", userId);

    return { plan, status, renewsAt, interval };
  });
