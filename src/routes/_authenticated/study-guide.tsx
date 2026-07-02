import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Loader2, BookOpen, Key, ListChecks } from "lucide-react";
import { generateStudyGuide } from "@/lib/ai.functions";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/study-guide")({
  component: StudyGuidePage,
});

type Guide = {
  summary: string;
  keyConcepts: string[];
  vocabulary: { term: string; definition: string }[];
  practiceQuestions: string[];
};

function StudyGuidePage() {
  const { data: profile } = useProfile();
  const gen = useServerFn(generateStudyGuide);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Enter a topic first.");
    setLoading(true);
    try {
      const result = await gen({ data: { topic, ageGroup: profile?.age_group ?? "adults" } });
      setGuide(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Study Guide</h1>
        <p className="mt-1 text-muted-foreground">Get an AI summary, key concepts, vocabulary and practice questions for any topic.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Topic</Label>
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="e.g. Newton's laws of motion" />
          </div>
          <Button variant="hero" size="lg" onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Building your guide…" : "Generate study guide"}
          </Button>
        </div>
      </div>

      {guide && (
        <div className="space-y-6">
          <Section icon={BookOpen} title="Summary">
            <p className="text-sm leading-relaxed text-muted-foreground">{guide.summary}</p>
          </Section>
          {guide.keyConcepts.length > 0 && (
            <Section icon={ListChecks} title="Key concepts">
              <ul className="space-y-2">
                {guide.keyConcepts.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm"><span className="text-primary">•</span> {c}</li>
                ))}
              </ul>
            </Section>
          )}
          {guide.vocabulary.length > 0 && (
            <Section icon={Key} title="Vocabulary">
              <dl className="space-y-3">
                {guide.vocabulary.map((v, i) => (
                  <div key={i} className="rounded-xl bg-muted/50 p-3">
                    <dt className="text-sm font-semibold">{v.term}</dt>
                    <dd className="text-sm text-muted-foreground">{v.definition}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}
          {guide.practiceQuestions.length > 0 && (
            <Section icon={ListChecks} title="Practice questions">
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {guide.practiceQuestions.map((p, i) => (<li key={i}>{p}</li>))}
              </ol>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-primary" /> {title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
