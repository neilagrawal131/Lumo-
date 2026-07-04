import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, BookOpen, ListChecks, Sparkles } from "lucide-react";
import { generateStudyGuide } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { cardsToTopic, type StudyCard } from "@/lib/study-modes";

type GuideMode = "guide" | "summary" | "vocab" | "concepts";

type Props = {
  setId: string;
  title: string;
  cards: StudyCard[];
  ageGroup: "kids" | "teens" | "college" | "adults";
  mode: GuideMode;
  onExit: () => void;
};

export function GuideView({ setId, title, cards, ageGroup, mode, onExit }: Props) {
  const gen = useServerFn(generateStudyGuide);
  const needsAi = mode !== "vocab";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["study-guide", setId],
    enabled: needsAi,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => gen({ data: { topic: cardsToTopic(title, cards), ageGroup } }),
  });

  // Vocabulary is derived directly from the set's cards — always accurate, no AI needed.
  if (mode === "vocab") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Header icon={<BookOpen className="h-5 w-5 text-primary" />} title="Vocabulary List" subtitle={`${cards.length} terms`} onExit={onExit} />
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {cards.map((c) => (
            <div key={c.id} className="grid grid-cols-1 gap-1 p-4 sm:grid-cols-3 sm:gap-4">
              <p className="font-semibold sm:col-span-1">{c.front}</p>
              <p className="text-muted-foreground sm:col-span-2">{c.back}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Generating with AI…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-muted-foreground">Couldn't generate that right now.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="hero" onClick={() => refetch()}>Try again</Button>
          <Button variant="outline" onClick={onExit}>Study modes</Button>
        </div>
      </div>
    );
  }

  if (mode === "summary") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Header icon={<Sparkles className="h-5 w-5 text-primary" />} title="Summary" onExit={onExit} />
        <div className="rounded-2xl border border-border bg-card p-6 text-lg leading-relaxed">{data.summary}</div>
      </div>
    );
  }

  if (mode === "concepts") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Header icon={<ListChecks className="h-5 w-5 text-primary" />} title="Key Concepts" onExit={onExit} />
        <ul className="space-y-2">
          {data.keyConcepts.map((k, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              <span>{k}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Full study guide
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Header icon={<BookOpen className="h-5 w-5 text-primary" />} title="Study Guide" onExit={onExit} />

      <Section title="Overview">
        <p className="leading-relaxed">{data.summary}</p>
      </Section>

      {data.keyConcepts.length > 0 && (
        <Section title="Key concepts">
          <ul className="space-y-2">
            {data.keyConcepts.map((k, i) => (
              <li key={i} className="flex items-start gap-2"><span className="text-primary">•</span><span>{k}</span></li>
            ))}
          </ul>
        </Section>
      )}

      {data.vocabulary.length > 0 && (
        <Section title="Vocabulary">
          <div className="divide-y divide-border">
            {data.vocabulary.map((v, i) => (
              <div key={i} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
                <p className="font-semibold">{v.term}</p>
                <p className="text-muted-foreground sm:col-span-2">{v.definition}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.practiceQuestions.length > 0 && (
        <Section title="Practice questions">
          <ol className="list-decimal space-y-2 pl-5">
            {data.practiceQuestions.map((p, i) => <li key={i}>{p}</li>)}
          </ol>
        </Section>
      )}
    </div>
  );
}

function Header({ icon, title, subtitle, onExit }: { icon: ReactNode; title: string; subtitle?: string; onExit: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onExit}>Study modes</Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
