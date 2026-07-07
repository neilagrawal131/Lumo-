import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, ArrowRight, RotateCcw, Sparkles, Loader2, Clock, Timer, Lightbulb } from "lucide-react";
import { explainAnswer, getHint } from "@/lib/ai.functions";
import { recordActivity, awardBadge } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type GradedQuestion,
  type StudyModeKey,
  gradeAnswer,
  modeLabel,
} from "@/lib/study-modes";

type Props = {
  title: string;
  modeKey: StudyModeKey;
  questions: GradedQuestion[];
  /** "immediate" reveals after each question; "deferred" grades at the end (tests/exams). */
  feedback: "immediate" | "deferred";
  timeLimitSec?: number;
  userId: string;
  onRestart: () => void;
  onExit: () => void;
};

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function QuizEngine({
  title,
  modeKey,
  questions,
  feedback,
  timeLimitSec,
  userId,
  onRestart,
  onExit,
}: Props) {
  const queryClient = useQueryClient();
  const explain = useServerFn(explainAnswer);
  const hintFn = useServerFn(getHint);
  const [hints, setHints] = useState<Record<number, string>>({});
  const [hintLoading, setHintLoading] = useState<Record<number, boolean>>({});

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => Array(questions.length).fill(""));
  const [checked, setChecked] = useState(false); // current question revealed (immediate mode)
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSec ?? 0);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [explaining, setExplaining] = useState<Record<number, boolean>>({});

  const total = questions.length;

  const isRight = useCallback(
    (i: number) => gradeAnswer(questions[i], answers[i], overrides[i]),
    [questions, answers, overrides],
  );

  const score = useMemo(() => {
    let s = 0;
    for (let i = 0; i < total; i++) if (isRight(i)) s++;
    return s;
  }, [total, isRight]);

  const recordedRef = useRef(false);
  const finish = useCallback(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setFinished(true);
    let s = 0;
    for (let i = 0; i < total; i++) if (gradeAnswer(questions[i], answers[i], overrides[i])) s++;
    const xp = 12 + s * 4;
    void (async () => {
      const res = await recordActivity(userId, "quiz", `${title} · ${modeLabel(modeKey)}`, xp);
      await awardBadge(userId, "first_quiz");
      if (total > 0 && s === total) await awardBadge(userId, "perfect_quiz");
      queryClient.invalidateQueries();
      if (res.leveledUp) toast.success(`⭐ Level ${res.newLevel}!`);
      else if (res.newBadges.length) toast.success("🏅 New badge unlocked!");
    })();
  }, [answers, overrides, questions, total, userId, title, modeKey, queryClient]);

  // Countdown for timed exams.
  useEffect(() => {
    if (feedback !== "deferred" || !timeLimitSec || finished) return;
    if (secondsLeft <= 0) {
      finish();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [feedback, timeLimitSec, finished, secondsLeft, finish]);

  if (total === 0) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <p className="text-muted-foreground">This set doesn't have enough cards for this mode yet.</p>
        <Button variant="soft" className="mt-4" onClick={onExit}>Choose another mode</Button>
      </div>
    );
  }

  function setAnswer(v: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  }

  function next() {
    if (idx + 1 < total) {
      setIdx((i) => i + 1);
      setChecked(false);
    } else {
      finish();
    }
  }

  async function requestExplanation(i: number) {
    if (explanations[i] || explaining[i]) return;
    setExplaining((p) => ({ ...p, [i]: true }));
    try {
      const q = questions[i];
      const res = await explain({
        data: {
          question: q.kind === "truefalse" ? `${q.term} — "${q.shown}". True or false?` : q.prompt,
          correct: correctText(q),
          chosen: answers[i] || "(no answer)",
        },
      });
      setExplanations((p) => ({ ...p, [i]: res.explanation }));
    } catch {
      toast.error("Couldn't load an explanation. Try again.");
    } finally {
      setExplaining((p) => ({ ...p, [i]: false }));
    }
  }

  async function requestHint(i: number) {
    if (hints[i] || hintLoading[i]) return;
    setHintLoading((p) => ({ ...p, [i]: true }));
    try {
      const q = questions[i];
      const res = await hintFn({ data: { question: q.kind === "truefalse" ? `${q.term} — "${q.shown}". True or false?` : q.prompt, answer: correctText(q) } });
      setHints((p) => ({ ...p, [i]: res.hint }));
    } catch {
      toast.error("Couldn't load a hint. Try again.");
    } finally {
      setHintLoading((p) => ({ ...p, [i]: false }));
    }
  }

  // ---------- Results ----------
  if (finished) {
    const pct = Math.round((score / total) * 100);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-elegant">
          <div className="text-5xl">{pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}</div>
          <h2 className="mt-3 text-2xl font-bold">{score} / {total} correct</h2>
          <p className="mt-1 text-muted-foreground">{modeLabel(modeKey)} · {pct}%</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="hero" onClick={onRestart}><RotateCcw className="h-4 w-4" /> Try again</Button>
            <Button variant="outline" onClick={onExit}>Study modes</Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review</h3>
          {questions.map((q, i) => {
            const right = isRight(i);
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${right ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {right ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {q.kind === "truefalse" ? `${q.term} — “${q.shown}”` : questionText(q)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your answer: <span className={right ? "text-success" : "text-destructive"}>{answers[i] || "—"}</span>
                    </p>
                    {!right && (
                      <p className="text-sm text-muted-foreground">
                        Correct: <span className="text-foreground">{correctText(q)}</span>
                      </p>
                    )}
                    {(q.kind === "fill" || q.kind === "short") && !right && (
                      <button
                        type="button"
                        onClick={() => setOverrides((o) => ({ ...o, [i]: true }))}
                        className="mt-1 text-xs font-medium text-primary hover:underline"
                      >
                        I was right — count it
                      </button>
                    )}
                    {!right && (
                      <div className="mt-2">
                        {explanations[i] ? (
                          <p className="rounded-xl bg-muted/60 p-3 text-sm">{explanations[i]}</p>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => requestExplanation(i)} disabled={explaining[i]}>
                            {explaining[i] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            Explain
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- Active question ----------
  const q = questions[idx];
  const answer = answers[idx];
  const revealed = feedback === "immediate" && checked;
  const answeredRight = revealed && isRight(idx);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{modeLabel(modeKey)}</span>
        <div className="flex items-center gap-3">
          {feedback === "deferred" && timeLimitSec ? (
            <span className={`flex items-center gap-1.5 text-sm font-semibold ${secondsLeft <= 15 ? "text-destructive" : "text-foreground"}`}>
              <Timer className="h-4 w-4" /> {fmtTime(secondsLeft)}
            </span>
          ) : null}
          <span className="text-sm text-muted-foreground">{idx + 1} / {total}</span>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-brand transition-all" style={{ width: `${(idx / total) * 100}%` }} />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {q.kind === "truefalse" ? "True or false?" : q.kind === "fill" ? "Fill in the blank" : "Question"}
        </p>
        <p className="mt-2 text-xl font-medium">{questionText(q)}</p>
        {q.kind === "fill" && q.hint && q.hint !== "Type the answer" && (
          <p className="mt-2 text-sm text-muted-foreground">Hint: {q.hint}</p>
        )}
        {hints[idx] && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning-foreground">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {hints[idx]}
          </p>
        )}

        {/* --- Inputs by kind --- */}
        {q.kind === "mcq" && (
          <div className="mt-6 grid gap-2">
            {q.options.map((opt) => {
              const selected = answer === opt;
              const showCorrect = revealed && opt === q.answer;
              const showWrong = revealed && selected && opt !== q.answer;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={revealed}
                  onClick={() => {
                    setAnswer(opt);
                    if (feedback === "immediate") setChecked(true);
                  }}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    showCorrect
                      ? "border-success bg-success/10 text-success"
                      : showWrong
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : selected
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "truefalse" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-muted/60 p-4 text-center text-lg font-medium">{q.shown}</div>
            <div className="grid grid-cols-2 gap-3">
              {(["True", "False"] as const).map((opt) => {
                const selected = answer === opt;
                const showCorrect = revealed && opt === q.answer;
                const showWrong = revealed && selected && opt !== q.answer;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={revealed}
                    onClick={() => {
                      setAnswer(opt);
                      if (feedback === "immediate") setChecked(true);
                    }}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                      showCorrect
                        ? "border-success bg-success/10 text-success"
                        : showWrong
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : selected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/40"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(q.kind === "fill" || q.kind === "short") && (
          <div className="mt-6 space-y-3">
            <Input
              value={answer}
              disabled={revealed}
              placeholder="Type your answer…"
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && answer.trim()) {
                  if (feedback === "immediate" && !revealed) setChecked(true);
                  else if (revealed) next();
                }
              }}
            />
            {revealed && (
              <div className={`rounded-xl p-3 text-sm ${answeredRight ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {answeredRight ? "Correct!" : <>Answer: <span className="font-medium">{correctText(q)}</span></>}
                {!answeredRight && (
                  <button
                    type="button"
                    onClick={() => setOverrides((o) => ({ ...o, [idx]: true }))}
                    className="ml-2 text-xs font-medium text-primary hover:underline"
                  >
                    I was right
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Controls --- */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
          {!revealed && !hints[idx] && (
            <Button variant="ghost" size="sm" onClick={() => requestHint(idx)} disabled={hintLoading[idx]}>
              {hintLoading[idx] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />} Hint
            </Button>
          )}
        </div>
        {feedback === "immediate" ? (
          revealed ? (
            <Button variant="hero" size="lg" onClick={next}>
              {idx + 1 < total ? <>Next <ArrowRight className="h-4 w-4" /></> : "See results"}
            </Button>
          ) : (
            (q.kind === "fill" || q.kind === "short") && (
              <Button variant="soft" size="lg" disabled={!answer.trim()} onClick={() => setChecked(true)}>
                Check
              </Button>
            )
          )
        ) : (
          <div className="flex items-center gap-2">
            {timeLimitSec ? <Clock className="h-4 w-4 text-muted-foreground" /> : null}
            <Button variant="hero" size="lg" onClick={next}>
              {idx + 1 < total ? <>Next <ArrowRight className="h-4 w-4" /></> : "Submit test"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function questionText(q: GradedQuestion): string {
  if (q.kind === "truefalse") return q.term;
  return q.prompt;
}

function correctText(q: GradedQuestion): string {
  if (q.kind === "truefalse") return q.answer;
  return q.answer;
}
