import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Check } from "lucide-react";
import { recordActivity } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { buildMatching, type StudyCard, type MatchItem } from "@/lib/study-modes";

type Props = {
  title: string;
  cards: StudyCard[];
  userId: string;
  seed: number;
  onRestart: () => void;
  onExit: () => void;
};

export function MatchingMode({ title, cards, userId, seed, onRestart, onExit }: Props) {
  const queryClient = useQueryClient();
  const rounds = useMemo(() => buildMatching(cards), [cards, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const [roundIdx, setRoundIdx] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [selectedDef, setSelectedDef] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const recordedRef = useRef(false);

  if (rounds.length === 0) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <p className="text-muted-foreground">Add at least 3 cards to use matching.</p>
        <Button variant="soft" className="mt-4" onClick={onExit}>Choose another mode</Button>
      </div>
    );
  }

  const round = rounds[roundIdx];
  const totalPairs = rounds.reduce((n, r) => n + r.terms.length, 0);

  function finish() {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setFinished(true);
    const accuracy = totalPairs > 0 ? Math.max(0, (totalPairs - mistakes) / totalPairs) : 0;
    const xp = 12 + Math.round(accuracy * totalPairs * 3);
    void (async () => {
      const res = await recordActivity(userId, "quiz", `${title} · Matching`, xp);
      queryClient.invalidateQueries();
      if (res.newBadges.length) toast.success("🏅 New badge unlocked!");
    })();
  }

  function tryMatch(termId: string, defId: string) {
    if (termId === defId) {
      const nextMatched = new Set(matched).add(termId);
      setMatched(nextMatched);
      setSelectedTerm(null);
      setSelectedDef(null);
      if (nextMatched.size >= round.terms.length) {
        if (roundIdx + 1 < rounds.length) {
          setTimeout(() => {
            setRoundIdx((r) => r + 1);
            setMatched(new Set());
          }, 350);
        } else {
          setTimeout(finish, 350);
        }
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongPair(`${termId}|${defId}`);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedTerm(null);
        setSelectedDef(null);
      }, 600);
    }
  }

  function clickTerm(id: string) {
    if (matched.has(id)) return;
    if (selectedDef) tryMatch(id, selectedDef);
    else setSelectedTerm(id === selectedTerm ? null : id);
  }
  function clickDef(id: string) {
    if (matched.has(id)) return;
    if (selectedTerm) tryMatch(selectedTerm, id);
    else setSelectedDef(id === selectedDef ? null : id);
  }

  if (finished) {
    const correct = totalPairs;
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="text-5xl">🧩</div>
        <h2 className="mt-3 text-2xl font-bold">All matched!</h2>
        <p className="mt-1 text-muted-foreground">{correct} pairs · {mistakes} mistake{mistakes === 1 ? "" : "s"}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="hero" onClick={onRestart}><RotateCcw className="h-4 w-4" /> Play again</Button>
          <Button variant="outline" onClick={onExit}>Study modes</Button>
        </div>
      </div>
    );
  }

  const cell = (item: MatchItem, side: "term" | "def") => {
    const isMatched = matched.has(item.cardId);
    const isSelected = side === "term" ? selectedTerm === item.cardId : selectedDef === item.cardId;
    const isWrong = wrongPair?.includes(item.cardId) && (side === "term" ? wrongPair.startsWith(item.cardId) : wrongPair.endsWith(item.cardId));
    return (
      <button
        key={`${side}-${item.cardId}`}
        type="button"
        disabled={isMatched}
        onClick={() => (side === "term" ? clickTerm(item.cardId) : clickDef(item.cardId))}
        className={`min-h-[3.5rem] rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
          isMatched
            ? "border-success/40 bg-success/10 text-success opacity-60"
            : isWrong
              ? "border-destructive bg-destructive/10 text-destructive"
              : isSelected
                ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/40"
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span>{item.text}</span>
          {isMatched && <Check className="h-3.5 w-3.5 shrink-0" />}
        </span>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Matching</span>
        <span className="text-sm text-muted-foreground">
          {rounds.length > 1 ? `Round ${roundIdx + 1} / ${rounds.length} · ` : ""}{matched.size} / {round.terms.length}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Tap a term, then its matching definition.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms</p>
          {round.terms.map((t) => cell(t, "term"))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Definitions</p>
          {round.defs.map((d) => cell(d, "def"))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
        {mistakes > 0 && <span className="text-xs text-muted-foreground">{mistakes} mistake{mistakes === 1 ? "" : "s"}</span>}
      </div>
    </div>
  );
}
