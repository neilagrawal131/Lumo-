import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, LifeBuoy, Mail, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPPORT_EMAIL, CONTACT_FORM_KEY } from "@/lib/support";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Still need help?" — a contact form that delivers the message to the support
// inbox (via Web3Forms). Until a form key is configured, falls back to a Gmail
// compose button so the page always works.
function ContactBox() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const hasFormKey = CONTACT_FORM_KEY.trim().length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please write a message first.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: CONTACT_FORM_KEY,
          email: email.trim(),
          message: message.trim(),
          subject: "New Etude support message",
          from_name: "Etude Help Page",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Something went wrong.");
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-primary" />
        <h2 className="mt-3 text-xl font-bold">Message sent!</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Thanks for reaching out — we'll reply to <span className="font-medium text-foreground">{email.trim()}</span> soon.
        </p>
      </div>
    );
  }

  // Fallback until the contact-form key is configured.
  if (!hasFormKey) {
    const gmailCompose =
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}` +
      `&su=${encodeURIComponent("Etude support")}`;
    return (
      <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center">
        <Mail className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 text-xl font-bold">Still need help?</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Can't find what you're looking for? Email us and we'll get back to you.
        </p>
        <Button asChild variant="hero" className="mt-5">
          <a href={gmailCompose} target="_blank" rel="noopener noreferrer">
            <Mail className="h-4 w-4" /> Email us
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8">
      <div className="text-center">
        <Mail className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 text-xl font-bold">Still need help?</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Send us a message and we'll reply to your email.
        </p>
      </div>
      <form onSubmit={onSubmit} className="mx-auto mt-6 max-w-md space-y-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="bg-background"
          required
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          rows={4}
          required
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" variant="hero" className="w-full" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send message
        </Button>
      </form>
    </div>
  );
}

function QA({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">{q}</h3>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" aria-label="Etude home">
            <Logo />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Help &amp; Support</h1>
            <p className="text-muted-foreground">Answers to common questions — and how to reach us.</p>
          </div>
        </div>

        {/* ---------- Getting started ---------- */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Getting started</h2>
          <div className="space-y-3">
            <QA q="How do I make a study set?">
              You have three ways: <strong>Generate with AI</strong> from any topic or your notes,
              <strong> upload a file</strong> (PDF, Word, PowerPoint, or a photo/image) and let AI build
              it, or <strong>create your own</strong> cards by hand. Head to <em>Study Sets</em> and pick
              whichever you like.
            </QA>
            <QA q="What can I upload?">
              PDFs, Word documents (.docx), PowerPoint (.pptx), plain text, and images/photos of notes.
              You can also drag-and-drop a file straight onto the generator.
            </QA>
            <QA q="What study modes are there?">
              Flashcards, multiple choice, true/false, fill-in-the-blank, short answer, matching, a timed
              exam (you pick the time limit), plus AI study guides, summaries, and vocabulary — all from
              the same set. Just hit <em>Study</em> on any set.
            </QA>
          </div>
        </section>

        {/* ---------- Plans & billing ---------- */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Plans &amp; billing</h2>
          <div className="space-y-3">
            <QA q="What's the difference between Free and Premium?">
              Free includes the core study tools with a daily AI limit and up to 10 study sets. Premium
              lifts the limits — a much higher daily AI allowance and unlimited sets. See the{" "}
              <Link to="/pricing" className="text-primary underline">Pricing page</Link> for details.
            </QA>
            <QA q="How do I upgrade, and is there a trial?">
              Premium comes with a 7-day free trial. Upgrade from the Pricing or Billing page — checkout
              is handled securely by Stripe.
            </QA>
            <QA q="How do I cancel?">
              Open the <strong>Billing</strong> page and manage or cancel your subscription anytime.
              You'll keep Premium until the end of the period you've already paid for.
            </QA>
          </div>
        </section>

        {/* ---------- Account & friends ---------- */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Account &amp; friends</h2>
          <div className="space-y-3">
            <QA q="How do I sign in?">
              Use <strong>Continue with Google</strong> or an email and password. Forgot your password?
              Use the “Forgot password” link on the login screen to reset it.
            </QA>
            <QA q="How do I share a set with a friend?">
              Add a friend by their email on the <Link to="/friends" className="text-primary underline">Friends</Link>{" "}
              page. Once they accept, tap the <strong>Share</strong> button on any of your sets and pick
              them. They can study it (but can't edit it). Sharing is free for everyone.
            </QA>
            <QA q="The AI isn't working / says it's busy.">
              If you hit your daily limit, it resets the next day (or upgrade to Premium for more). If it
              says the AI isn't configured, that's on our side — email us and we'll sort it out.
            </QA>
          </div>
        </section>

        {/* ---------- Contact ---------- */}
        <section className="mt-12">
          <ContactBox />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
