import {
  Layers, ListChecks, ToggleLeft, TextCursorInput, Puzzle, PencilLine,
  Shuffle, ClipboardCheck, Timer, BookOpen, Sparkles, BookMarked, Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { STUDY_MODES, type StudyModeKey, type ModeGroup } from "@/lib/study-modes";

const ICONS: Record<StudyModeKey, LucideIcon> = {
  flashcards: Layers,
  mcq: ListChecks,
  truefalse: ToggleLeft,
  fill: TextCursorInput,
  matching: Puzzle,
  short: PencilLine,
  mixed: Shuffle,
  practice: ClipboardCheck,
  timed: Timer,
  guide: BookOpen,
  summary: Sparkles,
  vocab: BookMarked,
  concepts: Lightbulb,
};

const GROUPS: { key: ModeGroup; label: string }[] = [
  { key: "learn", label: "Learn" },
  { key: "quiz", label: "Quiz & test" },
  { key: "review", label: "Review" },
];

export function ModePicker({
  usableCount,
  onPick,
}: {
  usableCount: number;
  onPick: (mode: StudyModeKey) => void;
}) {
  return (
    <div className="space-y-8">
      {GROUPS.map((group) => {
        const modes = STUDY_MODES.filter((m) => m.group === group.key);
        return (
          <div key={group.key}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {modes.map((m) => {
                const Icon = ICONS[m.key];
                const locked = usableCount < m.minCards;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={locked}
                    onClick={() => onPick(m.key)}
                    className={`group flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all ${
                      locked ? "cursor-not-allowed opacity-50" : "hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-semibold leading-tight">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{locked ? `Needs ${m.minCards}+ cards` : m.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
