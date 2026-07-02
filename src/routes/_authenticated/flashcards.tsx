import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Loader2, Sparkles, Trash2, FileUp, Plus } from "lucide-react";
import { generateFlashcards } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { recordActivity, awardBadge } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DifficultyPicker } from "@/components/DifficultyPicker";

export const Route = createFileRoute("/_authenticated/flashcards")({
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const gen = useServerFn(generateFlashcards);

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);

  const { data: sets } = useQuery({
    queryKey: ["all-sets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("flashcard_sets")
        .select("id, title, topic, difficulty, created_at, flashcards(count)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      setTopic((t) => (t ? t + "\n\n" : "") + text.slice(0, 4000));
      toast.success("Notes added from file");
    } else {
      toast.error("Please upload a .txt or .md file, or paste your notes.");
    }
  }

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error("Enter a topic or paste some notes first.");
      return;
    }
    setLoading(true);
    try {
      const result = await gen({
        data: { topic, count, difficulty, ageGroup: profile?.age_group ?? "adults" },
      });
      const { data: set, error } = await supabase
        .from("flashcard_sets")
        .insert({
          user_id: user!.id,
          title: result.title,
          topic: topic.slice(0, 200),
          difficulty,
          age_group: profile?.age_group ?? "adults",
        })
        .select()
        .single();
      if (error || !set) throw error ?? new Error("Could not save set");

      const rows = result.cards.map((c, i) => ({
        set_id: set.id,
        user_id: user!.id,
        front: c.front,
        back: c.back,
        position: i,
      }));
      await supabase.from("flashcards").insert(rows);

      await awardBadge(user!.id, "first_set");
      const res = await recordActivity(user!.id, "flashcards", result.title, 30);
      queryClient.invalidateQueries();
      toast.success(`Created ${result.cards.length} cards! +30 XP`);
      if (res.newBadges.length) toast.success(`🏅 New badge unlocked!`);
      navigate({ to: "/study/$setId", params: { setId: set.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSet(id: string) {
    await supabase.from("flashcard_sets").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["all-sets"] });
    toast.success("Set deleted");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Flashcards</h1>
        <p className="mt-1 text-muted-foreground">Generate a deck from any topic, notes, or file — then study with spaced repetition.</p>
      </div>

      {/* Generator */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-5 w-5 text-primary" /> AI Flashcard Generator</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Topic or notes</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={5}
              placeholder="e.g. The French Revolution — causes, key events and figures. Or paste your class notes here…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Number of cards: {count}</Label>
              <input
                type="range" min={3} max={20} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="hero" size="lg" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Generating…" : "Generate flashcards"}
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted">
              <FileUp className="h-4 w-4" /> Upload notes (.txt)
              <input type="file" accept=".txt,.md,text/plain" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>
      </div>

      {/* Library */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Your sets</h2>
        {!sets || sets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            <Layers className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">No flashcard sets yet. Generate your first deck above!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((s) => {
              const cardCount = (s.flashcards as { count: number }[] | null)?.[0]?.count ?? 0;
              return (
                <div key={s.id} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-elegant">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Layers className="h-5 w-5" />
                    </div>
                    <button onClick={() => deleteSet(s.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="mt-4 line-clamp-2 font-semibold">{s.title}</h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{s.difficulty}</span>
                    <span>{cardCount} cards</span>
                  </div>
                  <Button asChild variant="soft" className="mt-4 w-full">
                    <Link to="/study/$setId" params={{ setId: s.id }}>Study</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
