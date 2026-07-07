// Server-only Stripe webhook handler. Keeps each user's plan accurate the moment
// their subscription changes in Stripe (upgrade, renewal, cancellation, failed
// payment) — without waiting for them to reload the billing page.
//
// Signature verification uses Web Crypto (HMAC-SHA256) so we stay SDK-free.
// Requires env: STRIPE_WEBHOOK_SECRET (the "whsec_..." from the Stripe dashboard).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { reportServerError } from "./error-report.server";

const SIGNATURE_TOLERANCE_SECONDS = 300;

export const STRIPE_WEBHOOK_PATH = "/api/stripe-webhook";

// Constant-time-ish comparison of two hex strings.
function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(payload: string, header: string, secret: string, nowSeconds: number): Promise<boolean> {
  let t = "";
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1.push(v);
  }
  if (!t || v1.length === 0) return false;
  if (Math.abs(nowSeconds - Number(t)) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = await hmacSha256Hex(secret, `${t}.${payload}`);
  return v1.some((candidate) => hexEqual(candidate, expected));
}

type StripeSubscription = {
  id: string;
  status: string;
  customer: string | { id: string };
  current_period_end?: number;
};

function customerIdOf(sub: StripeSubscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
}

function mapPlan(sub: StripeSubscription) {
  const premium = sub.status === "active" || sub.status === "trialing";
  return {
    plan: premium ? "premium" : "free",
    status: sub.status,
    renewsAt: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    subscriptionId: sub.id,
  };
}

// Returns a Response the caller can return directly. Never throws.
export async function handleStripeWebhook(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await request.text();

  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set — rejecting.");
    return new Response("Webhook not configured", { status: 500 });
  }

  const sigHeader = request.headers.get("stripe-signature");
  if (!sigHeader) return new Response("Missing signature", { status: 400 });

  const nowSeconds = Math.floor(Date.now() / 1000);
  let valid = false;
  try {
    valid = await verifySignature(payload, sigHeader, secret, nowSeconds);
  } catch {
    valid = false;
  }
  if (!valid) return new Response("Invalid signature", { status: 400 });

  let event: { type?: string; data?: { object?: unknown } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  try {
    const type = event.type ?? "";
    // Every subscription lifecycle change carries the subscription object.
    if (type.startsWith("customer.subscription.")) {
      const sub = event.data?.object as StripeSubscription | undefined;
      const customerId = sub && customerIdOf(sub);
      if (sub && customerId) {
        const { plan, status, renewsAt, subscriptionId } = mapPlan(sub);
        await supabaseAdmin
          .from("profiles")
          .update({
            plan,
            subscription_status: status,
            plan_renews_at: renewsAt,
            stripe_subscription_id: subscriptionId,
          })
          .eq("stripe_customer_id", customerId);
      }
    }
    // Other event types are acknowledged and ignored.
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    // Return 500 so Stripe retries later.
    console.error("[stripe-webhook] handler error:", error);
    reportServerError(error, { where: "stripe-webhook", eventType: event.type });
    return new Response("Webhook handler failed", { status: 500 });
  }
}
