import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Loader2, ClipboardList, Trash2, Check, X, ArrowRight } from "lucide-react";
import { generateQuiz, type QuizQuestion } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { recordActivity, awardBadge } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DifficultyPicker } from "@/components/DifficultyPicker";

export const Route = createFileRoute("/_authenticated/quizzes")({
  component: QuizzesPage,
});

type Quiz = { id: string; title: string; difficulty: string; questions: QuizQuestion[] };

function QuizzesPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const gen = useServerFn(generateQuiz);

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Quiz | null>(null);

  const { data: quizzes } = useQuery({
    queryKey: ["quizzes-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("id, title, difficulty, questions").order("created_at", { ascending: false });
      return (data ?? []) as Quiz[];
    },
  });

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Enter a topic first.");
    setLoading(true);
    try {
      const result = await gen({ data: { topic, count, difficulty, ageGroup: profile?.age_group ?? "adults" } });
      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({ user_id: user!.id, title: result.title, topic: topic.slice(0, 200), difficulty, age_group: profile?.age_group ?? "adults", questions: result.questions })
        .select()
        .single();
      if (error || !quiz) throw error ?? new Error("Save failed");
      queryClient.invalidateQueries({ queryKey: ["quizzes-all"] });
      toast.success(`Created ${result.questions.length} questions!`);
      setActive({ id: quiz.id, title: result.title, difficulty, questions: result.questions });
      setTopic("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteQuiz(id: string) {
    await supabase.from("quizzes").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["quizzes-all"] });
  }

  if (active) return <QuizRunner quiz={active} onExit={() => setActive(null)} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Quizzes</h1>
        <p className="mt-1 text-muted-foreground">Generate a quiz on any topic and get instant feedback with explanations.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-5 w-5 text-primary" /> AI Quiz Generator</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Topic or notes</Label>
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} placeholder="e.g. Photosynthesis basics for a biology test" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Questions: {count}</Label>
              <input type="range" min={3} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </div>
          </div>
          <Button variant="hero" size="lg" onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating…" : "Generate quiz"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Your quizzes</h2>
        {!quizzes || quizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            <ClipboardList className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">No quizzes yet. Generate your first one above!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q) => (
              <div key={q.id} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-elegant">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent"><ClipboardList className="h-5 w-5" /></div>
                  <button onClick={() => deleteQuiz(q.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                </div>
                <h3 className="mt-4 line-clamp-2 font-semibold">{q.title}</h3>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{q.difficulty}</span>
                  <span>{q.questions.length} questions</span>
                </div>
                <Button variant="soft" className="mt-4 w-full" onClick={() => setActive(q)}>Take quiz</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizRunner({ quiz, onExit }: { quiz: Quiz; onExit: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = quiz.questions[i];
  const correct = answer.trim().toLowerCase() === (q?.answer ?? "").trim().toLowerCase();

  function check() {
    setChecked(true);
    if (correct) setScore((s) => s + 1);
  }

  async function next() {
    if (i + 1 < quiz.questions.length) {
      setI((v) => v + 1);
      setAnswer("");
      setChecked(false);
    } else {
      const finalScore = score;
      await supabase.from("quiz_attempts").insert({ quiz_id: quiz.id, user_id: user!.id, score: finalScore, total: quiz.questions.length });
      await awardBadge(user!.id, "first_quiz");
      if (finalScore === quiz.questions.length) await awardBadge(user!.id, "perfect_quiz");
      const res = await recordActivity(user!.id, "quiz", quiz.title, 15 + finalScore * 5);
      queryClient.invalidateQueries();
      if (res.newBadges.length) toast.success("🏅 New badge unlocked!");
      setFinished(true);
    }
  }

  if (finished) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="text-6xl">{pct === 100 ? "🏆" : pct >= 60 ? "🎉" : "📚"}</div>
        <h1 className="mt-4 text-2xl font-bold">You scored {score}/{quiz.questions.length}</h1>
        <p className="mt-2 text-muted-foreground">{pct}% — {pct >= 80 ? "Excellent work!" : pct >= 50 ? "Nice effort, keep practicing!" : "Review and try again!"}</p>
        <Button variant="hero" className="mt-6" onClick={onExit}>Back to quizzes</Button>
      </div>
    );
  }

  const options = q.type === "short_answer" ? [] : q.options;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
        <span className="text-sm text-muted-foreground">{i + 1} / {quiz.questions.length}</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-brand transition-all" style={{ width: `${(i / quiz.questions.length) * 100}%` }} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{q.type.replace("_", " ")}</span>
        <h2 className="mt-2 text-lg font-semibold">{q.question}</h2>

        <div className="mt-5 space-y-2">
          {options.length > 0 ? (
            options.map((opt) => {
              const isAnswer = opt.trim().toLowerCase() === q.answer.trim().toLowerCase();
              const chosen = answer === opt;
              let cls = "border-border hover:border-primary/40";
              if (checked && isAnswer) cls = "border-accent bg-accent/10";
              else if (checked && chosen && !isAnswer) cls = "border-destructive bg-destructive/10";
              else if (chosen) cls = "border-primary bg-primary/10";
              return (
                <button key={opt} disabled={checked} onClick={() => setAnswer(opt)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm transition-all ${cls}`}>
                  {opt}
                  {checked && isAnswer && <Check className="h-4 w-4 text-accent" />}
                  {checked && chosen && !isAnswer && <X className="h-4 w-4 text-destructive" />}
                </button>
              );
            })
          ) : (
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={checked} rows={2} placeholder="Type your answer…" />
          )}
        </div>

        {checked && (
          <div className={`mt-4 rounded-xl p-4 text-sm ${correct ? "bg-accent/10 text-foreground" : "bg-muted"}`}>
            <p className="font-medium">{correct ? "Correct! ✅" : `Answer: ${q.answer}`}</p>
            {q.explanation && <p className="mt-1 text-muted-foreground">{q.explanation}</p>}
          </div>
        )}

        <div className="mt-5">
          {!checked ? (
            <Button variant="hero" className="w-full" onClick={check} disabled={!answer.trim()}>Check answer</Button>
          ) : (
            <Button variant="hero" className="w-full" onClick={next}>
              {i + 1 < quiz.questions.length ? "Next question" : "See results"} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
