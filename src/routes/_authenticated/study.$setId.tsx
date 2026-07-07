import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, LayoutGrid, Compass, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { relatedTopics } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [timedSeconds, setTimedSeconds] = useState<number | null>(null);

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
    setTimedSeconds(null);
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
        <RelatedTopics title={title} />
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

        {(IMMEDIATE_MODES.includes(mode) || DEFERRED_MODES.includes(mode)) &&
          (mode === "timed" && timedSeconds === null ? (
            <TimedSetup count={questions.length} onStart={setTimedSeconds} onExit={() => goMode(undefined)} />
          ) : (
            <QuizEngine
              key={`${mode}-${seed}`}
              title={title}
              modeKey={mode}
              questions={questions}
              feedback={DEFERRED_MODES.includes(mode) ? "deferred" : "immediate"}
              timeLimitSec={mode === "timed" ? timedSeconds ?? undefined : undefined}
              userId={user!.id}
              onRestart={() => setSeed((s) => s + 1)}
              onExit={() => goMode(undefined)}
            />
          ))}

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

function TimedSetup({ count, onStart, onExit }: { count: number; onStart: (seconds: number) => void; onExit: () => void }) {
  const presets = [5, 10, 15, 20, 30];
  const suggested = Math.max(1, Math.round((count * 45) / 60));
  const [custom, setCustom] = useState("");

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-elegant">
        <div className="text-4xl">⏱️</div>
        <h2 className="mt-3 text-2xl font-bold">Timed Exam</h2>
        <p className="mt-1 text-sm text-muted-foreground">{count} questions — choose your time limit.</p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {presets.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onStart(m * 60)}
              className="rounded-xl border border-border px-3 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              {m} min
            </button>
          ))}
          <button
            type="button"
            onClick={() => onStart(suggested * 60)}
            className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary"
          >
            {suggested} min
            <span className="block text-[10px] font-normal opacity-70">suggested</span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={180}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom minutes"
            onKeyDown={(e) => {
              if (e.key === "Enter" && Number(custom) >= 1) onStart(Math.min(180, Number(custom)) * 60);
            }}
          />
          <Button variant="hero" disabled={!custom || Number(custom) < 1} onClick={() => onStart(Math.min(180, Math.max(1, Number(custom))) * 60)}>
            Start
          </Button>
        </div>

        <button type="button" onClick={onExit} className="mt-4 text-sm text-muted-foreground hover:underline">Cancel</button>
      </div>
    </div>
  );
}

function RelatedTopics({ title }: { title: string }) {
  const gen = useServerFn(relatedTopics);
  const { data, isLoading } = useQuery({
    queryKey: ["related-topics", title],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => gen({ data: { topic: title } }),
  });
  const topics = data?.topics ?? [];

  if (isLoading) {
    return (
      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Finding related topics…
      </div>
    );
  }
  if (topics.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Compass className="h-4 w-4" /> Related topics to explore
      </h2>
      <div className="flex flex-wrap gap-2">
        {topics.map((t) => (
          <Link
            key={t}
            to="/flashcards"
            search={{ topic: t }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            {t} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
