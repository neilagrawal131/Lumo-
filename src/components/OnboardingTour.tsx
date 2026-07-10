import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Upload, GraduationCap, Trophy, Users, ArrowRight, ArrowLeft, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to Etude 👋",
    body: "Turn any topic, your notes, or a file into flashcards, quizzes, and study guides — powered by AI. Here's a 30-second tour.",
  },
  {
    icon: Upload,
    title: "Create a study set",
    body: "Type a topic, paste your notes, or upload a PDF, Word doc, PowerPoint, or a photo of your notes — Etude builds the cards for you. Or make them by hand.",
  },
  {
    icon: GraduationCap,
    title: "Study your way",
    body: "Flashcards, multiple choice, true/false, matching, a timed exam, and AI study guides — all from the same set. Just hit Study on any set to begin.",
  },
  {
    icon: Trophy,
    title: "Build streaks & earn XP",
    body: "Study a little each day to keep your streak alive, earn XP, level up, and collect badges. Your progress lives right here on the dashboard.",
  },
  {
    icon: Users,
    title: "Study with friends",
    body: "Add friends by email and share your study sets with them — free for everyone. Perfect for group study and exam prep.",
  },
];

// One-time welcome tour for new users. Remembered per user in localStorage so it
// only shows once (and never for returning users who've dismissed it).
export function OnboardingTour({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const storageKey = `etude-onboarded-v1-${userId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      /* localStorage unavailable — just don't show the tour */
    }
  }, [storageKey]);

  function finish(goCreate: boolean) {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    if (goCreate) navigate({ to: "/flashcards" });
  }

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(false); }}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl">{current.title}</DialogTitle>
          <DialogDescription className="text-center text-[15px] leading-relaxed">
            {current.body}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-primary" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep((n) => n - 1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => finish(false)}>
              Skip
            </Button>
          )}

          {isLast ? (
            <Button variant="hero" onClick={() => finish(true)}>
              <Check className="h-4 w-4" /> Create my first set
            </Button>
          ) : (
            <Button variant="hero" onClick={() => setStep((n) => n + 1)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
