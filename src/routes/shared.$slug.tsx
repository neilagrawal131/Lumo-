import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/shared/$slug")({
  head: () => ({
    meta: [
      { title: "Shared study set — Etude" },
      { name: "description", content: "Study a shared flashcard set on Etude." },
      { property: "og:title", content: "Shared study set — Etude" },
      { property: "og:description", content: "Study a shared flashcard set on Etude." },
    ],
  }),
  component: SharedSet,
});

function SharedSet() {
  const { slug } = Route.useParams();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["shared-set", slug],
    queryFn: async () => {
      const { data: set } = await supabase
        .from("flashcard_sets")
        .select("id, title, subject")
        .eq("share_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (!set) return { set: null, cards: [] };
      const { data: cards } = await supabase
        .from("flashcards")
        .select("id, front, back, image_url")
        .eq("set_id", set.id)
        .order("position");
      return { set, cards: cards ?? [] };
    },
  });

  return (
    <div className="min-h-screen bg-soft">
      <header className="flex items-center justify-between border-b border-border/60 bg-card/90 px-4 py-3 backdrop-blur md:px-8">
        <Link to="/"><Logo /></Link>
        <Button asChild variant="hero" size="sm"><Link to="/auth" search={{ mode: "signup" }}><Sparkles className="h-4 w-4" /> Try Etude free</Link></Button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.set ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <h1 className="text-xl font-bold">Set not found</h1>
            <p className="mt-2 text-muted-foreground">This study set is private or no longer available.</p>
            <Button asChild variant="soft" className="mt-6"><Link to="/">Go home</Link></Button>
          </div>
        ) : data.cards.length === 0 ? (
          <div className="text-center text-muted-foreground">This set has no cards yet.</div>
        ) : (
          <SharedViewer
            title={data.set.title}
            subject={data.set.subject}
            cards={data.cards}
            index={index}
            setIndex={setIndex}
            flipped={flipped}
            setFlipped={setFlipped}
          />
        )}
      </main>
    </div>
  );
}

type Card = { id: string; front: string; back: string; image_url: string | null };

function SharedViewer({
  title, subject, cards, index, setIndex, flipped, setFlipped,
}: {
  title: string;
  subject: string | null;
  cards: Card[];
  index: number;
  setIndex: (fn: (i: number) => number) => void;
  flipped: boolean;
  setFlipped: (fn: (f: boolean) => boolean | boolean) => void;
}) {
  const card = cards[index];
  return (
    <div>
      <div className="mb-1 text-sm font-medium text-primary">{subject ?? "Shared set"}</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-1 text-sm text-muted-foreground">{index + 1} / {cards.length}</div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-brand transition-all" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="mt-6 flex min-h-[16rem] w-full flex-col items-center justify-center rounded-3xl border border-border bg-card p-8 text-center shadow-elegant transition-transform hover:-translate-y-0.5"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{flipped ? "Answer" : "Question"}</span>
        {card.image_url && <img src={card.image_url} alt="" className="mt-3 max-h-40 rounded-lg" />}
        <span key={`${index}-${flipped}`} className="mt-3 animate-flip-in text-xl font-medium">{flipped ? card.back : card.front}</span>
        <span className="mt-6 text-xs text-muted-foreground">Tap to flip</span>
      </button>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => { setFlipped(() => false); setIndex((i) => Math.max(0, i - 1)); }}
          disabled={index === 0}
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        <Button
          variant="hero"
          onClick={() => { setFlipped(() => false); setIndex((i) => Math.min(cards.length - 1, i + 1)); }}
          disabled={index === cards.length - 1}
        >
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
