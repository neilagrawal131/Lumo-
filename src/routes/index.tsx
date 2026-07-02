import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Layers,
  ClipboardList,
  BookOpen,
  Trophy,
  BarChart3,
  Upload,
  Wand2,
  GraduationCap,
  Check,
  Star,
  Baby,
  Headphones,
  Briefcase,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

const features = [
  { icon: Layers, title: "AI Flashcard Generator", desc: "Turn any topic, notes, or PDF into high-quality flashcards with spaced repetition." },
  { icon: ClipboardList, title: "AI Quiz Generator", desc: "Multiple-choice, true/false, matching & short-answer quizzes with instant feedback." },
  { icon: BookOpen, title: "Study Guides", desc: "AI summaries, key concepts, vocabulary and practice questions — ready to review." },
  { icon: Trophy, title: "Gamified Learning", desc: "Earn XP, unlock badges, complete daily challenges and level up as you learn." },
  { icon: BarChart3, title: "Progress Analytics", desc: "Track streaks, quiz scores and study history with clear, motivating charts." },
  { icon: GraduationCap, title: "Adaptive Difficulty", desc: "Choose Easy, Medium or Hard — content adapts to your level and age." },
];

const steps = [
  { icon: Upload, title: "Add your material", desc: "Enter a topic or paste your notes. Pick a difficulty and you're ready." },
  { icon: Wand2, title: "Let AI do the work", desc: "In seconds, Lumo builds flashcards, quizzes and study guides tailored to you." },
  { icon: Trophy, title: "Learn & level up", desc: "Study, review, take quizzes, build streaks and watch your progress soar." },
];

const audiences = [
  { icon: Baby, title: "Kids", desc: "Colorful, playful and simple — big buttons and friendly language." },
  { icon: Headphones, title: "Teens", desc: "Modern, interactive design that keeps learning engaging." },
  { icon: GraduationCap, title: "College", desc: "Productivity-focused layout to power through any subject." },
  { icon: Briefcase, title: "Adults", desc: "Clean, professional experience for lifelong learners." },
];

const testimonials = [
  { name: "Maya R.", role: "High-school student", quote: "I made a full deck for my biology exam in two minutes. The quizzes actually explain what I got wrong!" },
  { name: "Daniel K.", role: "College sophomore", quote: "The streaks keep me coming back every day. My grades have genuinely improved this semester." },
  { name: "Priya S.", role: "Parent", quote: "My daughter loves the kid mode. It feels like a game but she's really learning." },
];

const plans = [
  { name: "Free", price: "$0", period: "forever", features: ["Unlimited flashcards", "AI quizzes", "Progress tracking", "Streaks & badges"], cta: "Get Started", highlight: false },
  { name: "Pro", price: "$8", period: "/month", features: ["Everything in Free", "Unlimited AI generations", "Advanced analytics", "Priority AI speed", "Study guides & summaries"], cta: "Try Pro Free", highlight: true },
  { name: "Teams", price: "$24", period: "/month", features: ["Everything in Pro", "Up to 5 learners", "Shared decks", "Leaderboards", "Progress reports"], cta: "Contact us", highlight: false },
];

const faqs = [
  { q: "How does Lumo create flashcards and quizzes?", a: "Just enter a topic or paste your notes. Lumo's AI reads your material and instantly generates accurate flashcards, quizzes and study guides tailored to your chosen difficulty and age level." },
  { q: "Is Lumo free to use?", a: "Yes! The Free plan gives you unlimited flashcards, AI quizzes, streaks and progress tracking. Pro unlocks unlimited AI generations, study guides and advanced analytics." },
  { q: "What subjects can I study?", a: "Anything — from history and biology to languages, coding and professional certifications. If you can describe it, Lumo can help you learn it." },
  { q: "Does it work for kids?", a: "Absolutely. Lumo adapts to your age group, offering a colorful, simple experience for kids and a focused, professional one for adults." },
  { q: "How does spaced repetition work?", a: "Lumo schedules your flashcards so you review them right before you'd forget — the most efficient, science-backed way to remember more in less time." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-32 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-powered study tools
            </span>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Learn <span className="text-gradient">Smarter</span> with AI
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Turn any topic, notes or PDF into flashcards, quizzes and study guides in seconds.
              Track your progress, build streaks and make studying genuinely enjoyable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/auth" search={{ mode: "signup" }}>Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/auth" search={{ mode: "signup" }}>Try It Free</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <span>Loved by 12,000+ learners</span>
            </div>
          </div>
          <div className="relative animate-float">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-brand opacity-20 blur-2xl" />
            <img
              src={heroImg}
              alt="AI-generated flashcards, quizzes and study charts floating together"
              width={1280}
              height={1024}
              className="w-full drop-shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/60 bg-card/50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {[
            { n: "2M+", l: "Cards generated" },
            { n: "500K+", l: "Quizzes taken" },
            { n: "98%", l: "Feel more confident" },
            { n: "12K+", l: "Happy learners" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-3xl font-bold text-gradient">{s.n}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold">Everything you need to study better</h2>
          <p className="mt-4 text-muted-foreground">
            One platform for creating, reviewing and mastering any subject — powered by AI.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-soft">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold">How it works</h2>
            <p className="mt-4 text-muted-foreground">Go from blank page to confident in three simple steps.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-border bg-card p-7 shadow-sm">
                <span className="absolute -top-4 left-7 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-primary-foreground shadow-elegant">
                  {i + 1}
                </span>
                <s.icon className="mt-3 h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold">Built for every learner</h2>
          <p className="mt-4 text-muted-foreground">
            Lumo adapts its look, language and difficulty to you — whatever your age.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <a.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-semibold">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-soft">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold">Learners love Lumo</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-border bg-card p-7 shadow-sm">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-foreground">"{t.quote}"</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-semibold text-primary-foreground">
                    {t.name[0]}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold">Simple, honest pricing</h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when you're ready to supercharge your studying.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl border p-8 shadow-sm ${
                p.highlight ? "border-primary bg-card shadow-elegant ring-2 ring-primary/30" : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="pb-1 text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" /> {feat}
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlight ? "hero" : "outline"} className="mt-8 w-full" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>{p.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-soft">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-4xl font-bold">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-base font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-hero px-8 py-16 text-center shadow-float">
          <div className="pointer-events-none absolute inset-0 bg-black/5" />
          <div className="relative">
            <h2 className="text-4xl font-bold text-primary-foreground">Ready to learn smarter?</h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
              Join thousands of learners using AI to study faster, remember more and stay motivated.
            </p>
            <Button asChild size="xl" className="mt-8 bg-background text-foreground hover:bg-background/90">
              <Link to="/auth" search={{ mode: "signup" }}>Start learning free</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
