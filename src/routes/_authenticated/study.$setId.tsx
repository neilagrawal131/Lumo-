import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { recordActivity } from "@/lib/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/study/$setId")({
  component: StudyMode,
});

function StudyMode() {
  const { setId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: setData } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => {
      const { data: set } = await supabase.from("flashcard_sets").select("title").eq("id", setId).single();
      const { data: cards } = await supabase
        .from("flashcards")
        .select("id, front, back, interval_days, ease")
        .eq("set_id", setId)
        .order("position");
      return { set, cards: cards ?? [] };
    },
  });

  const cards = setData?.cards ?? [];
  const card = cards[index];

  async function rate(remembered: boolean) {
    if (!card) return;
    // Simple SM-2-ish spaced repetition update
    const ease = Math.max(1.3, (card.ease ?? 2.5) + (remembered ? 0.1 : -0.2));
    const interval = remembered ? Math.max(1, Math.round((card.interval_days || 1) * ease)) : 1;
    const due = new Date();
    due.setDate(due.getDate() + interval);
    await supabase
      .from("flashcards")
      .update({ ease, interval_days: interval, due_date: due.toISOString().slice(0, 10), review_count: (card as { review_count?: number }).review_count ?? 0 })
      .eq("id", card.id);

    if (remembered) setKnown((k) => k + 1);
    setFlipped(false);
    if (index + 1 < cards.length) {
      setIndex((i) => i + 1);
    } else {
      setSaving(true);
      const xp = 10 + (remembered ? 2 : 0);
      const res = await recordActivity(user!.id, "study", setData?.set?.title ?? "Study", xp + known * 2);
      queryClient.invalidateQueries();
      if (res.newBadges.length) toast.success("🏅 New badge unlocked!");
      setDone(true);
      setSaving(false);
    }
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setDone(false);
  }

  if (!setData) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (cards.length === 0) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">This set has no cards.</p>
        <Button asChild variant="soft" className="mt-4"><Link to="/flashcards">Back to flashcards</Link></Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-4 text-2xl font-bold">Session complete!</h1>
        <p className="mt-2 text-muted-foreground">You remembered {known} of {cards.length} cards.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="hero" onClick={restart}><RotateCcw className="h-4 w-4" /> Study again</Button>
          <Button asChild variant="outline"><Link to="/flashcards">Done</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm"><Link to="/flashcards"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <span className="text-sm text-muted-foreground">{index + 1} / {cards.length}</span>
      </div>
      <h1 className="mt-2 text-xl font-bold">{setData.set?.title}</h1>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-brand transition-all" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="mt-6 flex min-h-[16rem] w-full flex-col items-center justify-center rounded-3xl border border-border bg-card p-8 text-center shadow-elegant transition-transform hover:-translate-y-0.5"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{flipped ? "Answer" : "Question"}</span>
        <span key={`${index}-${flipped}`} className="mt-3 animate-flip-in text-xl font-medium">{flipped ? card.back : card.front}</span>
        <span className="mt-6 text-xs text-muted-foreground">Tap to flip</span>
      </button>

      {flipped ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={() => rate(false)} disabled={saving} className="border-destructive/40 text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4" /> Still learning
          </Button>
          <Button variant="hero" size="lg" onClick={() => rate(true)} disabled={saving}>
            <Check className="h-4 w-4" /> Got it
          </Button>
        </div>
      ) : (
        <Button variant="soft" size="lg" className="mt-6 w-full" onClick={() => setFlipped(true)}>Show answer</Button>
      )}
    </div>
  );
}
