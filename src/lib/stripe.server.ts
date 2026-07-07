// Server-only Stripe REST helper. Calls the Stripe API directly with fetch so
// we don't need the stripe SDK as a dependency. Uses STRIPE_SECRET_KEY.
// (Checkout + hosted Customer Portal; sandbox test mode until live keys are set.)
const STRIPE_API = "https://api.stripe.com/v1";

type Params = Record<string, string | number | boolean | undefined>;

function encode(params: Params): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) usp.append(k, String(v));
  }
  return usp.toString();
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export async function stripeFetch(
  path: string,
  method: "GET" | "POST",
  params: Params = {},
): Promise<any> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Billing isn't set up yet. (Missing STRIPE_SECRET_KEY.)");

  const isGet = method === "GET";
  const url = isGet && Object.keys(params).length ? `${STRIPE_API}${path}?${encode(params)}` : `${STRIPE_API}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: isGet ? undefined : encode(params),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe request failed (${res.status}).`);
  }
  return json;
}
