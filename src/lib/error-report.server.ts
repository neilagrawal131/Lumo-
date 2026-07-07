// Server-only error forwarding. When ERROR_WEBHOOK_URL is set (a Slack, Discord,
// or any incoming-webhook URL), server-side errors are POSTed there so you get
// alerted in production instead of digging through Vercel logs. No-ops when the
// env var is absent, so it's safe to ship without configuring anything.
//
// Slack & Discord both accept a JSON body with a "text"/"content" field; we send
// both keys so either works. Fire-and-forget — never throws, never blocks.

function summarize(error: unknown): string {
  if (error instanceof Error) {
    const stack = error.stack ? `\n${error.stack.split("\n").slice(0, 4).join("\n")}` : "";
    return `${error.name}: ${error.message}${stack}`;
  }
  try {
    return String(typeof error === "string" ? error : JSON.stringify(error));
  } catch {
    return "Unknown error";
  }
}

export function reportServerError(error: unknown, context: Record<string, unknown> = {}): void {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;

  const detail = summarize(error).slice(0, 1500);
  const ctx = Object.keys(context).length ? `\ncontext: ${JSON.stringify(context)}` : "";
  const text = `🔴 Etude server error\n${detail}${ctx}`;

  // Fire-and-forget; swallow everything so reporting can never break a request.
  try {
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, content: text }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
