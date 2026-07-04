import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ModePicker } from "@/components/study/ModePicker";
import { FlashcardMode } from "@/components/study/FlashcardMode";
import { MatchingMode } from "@/components/study/MatchingMode";
import { QuizEngine } from "@/components/study/QuizEngine";
import { GuideView } from "@/components/study/GuideView";
import {
  STUDY_MODES,
  MODE_MAP,
  isStudyMode,
  buildQuestions,
  usableCards,
  type StudyModeKey,
} from "@/lib/study-modes";

type StudySearch = { mode?: StudyModeKey };

export const Route = createFileRoute("/_authenticated/study/$setId")({
  validateSearch: (search: Record<string, unknown>): StudySearch =>
    isStudyMode(search.mode) ? { mode: search.mode } : {},
  component: StudyHub,
});

const IMMEDIATE_MODES: StudyModeKey[] = ["mcq", "truefalse", "fill", "short", "mixed"];
const DEFERRED_MODES: StudyModeKey[] = ["practice", "timed"];
const GUIDE_MODES: StudyModeKey[] = ["guide", "summary", "vocab", "concepts"];

function StudyHub() {
  const { setId } = Route.useParams();
  const { mode } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seed, setSeed] = useState(0);

  const { data: setData } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => {
      const { data: set } = await supabase
        .from("flashcard_sets")
        .select("title, age_group")
        .eq("id", setId)
        .single();
      const { data: cards } = await supabase
        .from("flashcards")
        .select("id, front, back, image_url, interval_days, ease, review_count")
        .eq("set_id", setId)
        .order("position");
      return { set, cards: cards ?? [] };
    },
  });

  const cards = setData?.cards ?? [];
  const usableCount = useMemo(() => usableCards(cards).length, [cards]);

  // Regenerate on restart / mode change via seed; the component is also remounted by key.
  const questions = useMemo(() => {
    if (!mode || (!IMMEDIATE_MODES.includes(mode) && !DEFERRED_MODES.includes(mode))) return [];
    return buildQuestions(mode, cards);
  }, [mode, cards, seed]);

  function goMode(next?: StudyModeKey) {
    setSeed((s) => s + 1);
    navigate({ to: "/study/$setId", params: { setId }, search: next ? { mode: next } : {} });
  }

  if (!setData) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (cards.length === 0) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">This set has no cards yet.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button asChild variant="hero"><Link to="/editor/$setId" params={{ setId }}>Add cards</Link></Button>
          <Button asChild variant="soft"><Link to="/flashcards">Back to flashcards</Link></Button>
        </div>
      </div>
    );
  }

  const title = setData.set?.title ?? "Study set";
  const ageGroup = (setData.set?.age_group ?? "adults") as "kids" | "teens" | "college" | "adults";

  // ---------- Mode overview (the one-click hub) ----------
  if (!mode) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm"><Link to="/flashcards"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
          <span className="text-sm text-muted-foreground">{cards.length} card{cards.length === 1 ? "" : "s"}</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">Pick how you want to study — switch anytime, no need to recreate the set.</p>
        </div>
        <ModePicker usableCount={usableCount} onPick={goMode} />
      </div>
    );
  }

  // ---------- Active mode ----------
  const meta = MODE_MAP[mode];
  const availableModes = STUDY_MODES.filter((m) => usableCount >= m.minCards);

  return (
    <div className="space-y-5">
      {/* Mode switcher bar — one-click switching between every mode */}
      <div className="flex items-center gap-2">
        <Button variant="soft" size="sm" onClick={() => goMode(undefined)}>
          <LayoutGrid className="h-4 w-4" /> All modes
        </Button>
        <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1">
          {availableModes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => goMode(m.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                m.key === mode
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {mode === "flashcards" && (
          <FlashcardMode key={`flashcards-${seed}`} title={title} cards={cards} userId={user!.id} onExit={() => goMode(undefined)} />
        )}

        {mode === "matching" && (
          <MatchingMode
            key={`matching-${seed}`}
            title={title}
            cards={cards}
            userId={user!.id}
            seed={seed}
            onRestart={() => setSeed((s) => s + 1)}
            onExit={() => goMode(undefined)}
          />
        )}

        {(IMMEDIATE_MODES.includes(mode) || DEFERRED_MODES.includes(mode)) && (
          <QuizEngine
            key={`${mode}-${seed}`}
            title={title}
            modeKey={mode}
            questions={questions}
            feedback={DEFERRED_MODES.includes(mode) ? "deferred" : "immediate"}
            timeLimitSec={mode === "timed" ? Math.max(60, questions.length * 45) : undefined}
            userId={user!.id}
            onRestart={() => setSeed((s) => s + 1)}
            onExit={() => goMode(undefined)}
          />
        )}

        {GUIDE_MODES.includes(mode) && (
          <GuideView
            key={`${mode}-${seed}`}
            setId={setId}
            title={title}
            cards={cards}
            ageGroup={ageGroup}
            mode={mode as "guide" | "summary" | "vocab" | "concepts"}
            onExit={() => goMode(undefined)}
          />
        )}
      </div>

      <p className="sr-only">{meta.description}</p>
    </div>
  );
}
