import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Loader2, Sparkles, Trash2, FileUp, PenLine, Pencil, Globe, Folder, ImagePlus } from "lucide-react";
import { generateFlashcards, generateSetFromImage } from "@/lib/ai.functions";
import { extractTextFromFile } from "@/lib/extract-text";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { recordActivity, awardBadge } from "@/lib/progress";
import { FREE_SET_LIMIT, isPremium } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DifficultyPicker } from "@/components/DifficultyPicker";

export const Route = createFileRoute("/_authenticated/flashcards")({
  validateSearch: (s: Record<string, unknown>): { topic?: string } =>
    typeof s.topic === "string" ? { topic: s.topic } : {},
  component: FlashcardsPage,
});

// Downscale + re-encode in the browser so the upload stays well under the
// serverless request-body limit (vision models don't need full resolution).
async function downscaleImage(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read"));
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("img"));
      im.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

function FlashcardsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const gen = useServerFn(generateFlashcards);
  const genImage = useServerFn(generateSetFromImage);
  const { topic: initialTopic } = Route.useSearch();

  const [topic, setTopic] = useState(initialTopic ?? "");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [folderFilter, setFolderFilter] = useState<string>("all");

  const { data: folders } = useQuery({
    queryKey: ["folders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("folders").select("id, name").order("created_at");
      return data ?? [];
    },
  });

  const { data: sets } = useQuery({
    queryKey: ["all-sets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("flashcard_sets")
        .select("id, title, topic, subject, difficulty, is_public, is_manual, folder_id, created_at, flashcards(count)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileLoading(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        toast.error("Couldn't find text in that file. Try the image upload or paste your notes.");
        return;
      }
      setTopic((t) => ((t ? t + "\n\n" : "") + text).slice(0, 4000));
      toast.success(`Loaded notes from ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file");
    } finally {
      setFileLoading(false);
    }
  }

  async function ensureCanCreate(): Promise<boolean> {
    if (isPremium(profile?.plan)) return true;
    const { count: setCount } = await supabase
      .from("flashcard_sets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id);
    if ((setCount ?? 0) >= FREE_SET_LIMIT) {
      toast.error("Free plan is limited to 10 study sets. Upgrade to Premium for unlimited.");
      navigate({ to: "/pricing" });
      return false;
    }
    return true;
  }

  async function persistSet(setTitle: string, generated: { front: string; back: string }[], topicLabel: string) {
    const { data: set, error } = await supabase
      .from("flashcard_sets")
      .insert({
        user_id: user!.id,
        title: setTitle,
        topic: topicLabel.slice(0, 200),
        difficulty,
        age_group: profile?.age_group ?? "adults",
      })
      .select()
      .single();
    if (error || !set) throw error ?? new Error("Could not save set");
    const rows = generated.map((c, i) => ({ set_id: set.id, user_id: user!.id, front: c.front, back: c.back, position: i }));
    await supabase.from("flashcards").insert(rows);
    await awardBadge(user!.id, "first_set");
    const res = await recordActivity(user!.id, "flashcards", setTitle, 30);
    queryClient.invalidateQueries();
    toast.success(`Created ${generated.length} cards! +30 XP`);
    if (res.newBadges.length) toast.success("🏅 New badge unlocked!");
    navigate({ to: "/study/$setId", params: { setId: set.id }, search: { mode: "flashcards" } });
  }

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error("Enter a topic or paste some notes first.");
      return;
    }
    if (!(await ensureCanCreate())) return;
    setLoading(true);
    try {
      const result = await gen({ data: { topic, count, difficulty, ageGroup: profile?.age_group ?? "adults" } });
      await persistSet(result.title, result.cards, topic);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image must be under 6MB.");
      return;
    }
    if (!(await ensureCanCreate())) return;
    setImgLoading(true);
    try {
      const dataUrl = await downscaleImage(file);
      const result = await genImage({ data: { image: dataUrl, count, difficulty, ageGroup: profile?.age_group ?? "adults" } });
      await persistSet(result.title, result.cards, "From image");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create a set from the image");
    } finally {
      setImgLoading(false);
    }
  }

  async function deleteSet(id: string) {
    await supabase.from("flashcard_sets").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["all-sets"] });
    toast.success("Set deleted");
  }

  const visibleSets = (sets ?? []).filter((s) =>
    folderFilter === "all" ? true : folderFilter === "none" ? !s.folder_id : s.folder_id === folderFilter,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Flashcards</h1>
          <p className="mt-1 text-muted-foreground">Generate a deck with AI, or build your own from scratch — then study with spaced repetition.</p>
        </div>
        <Button asChild variant="hero"><Link to="/create"><PenLine className="h-4 w-4" /> Create your own</Link></Button>
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
            <label className={`inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted ${fileLoading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              {fileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {fileLoading ? "Reading…" : "Upload PDF / Word / PPT / notes"}
              <input type="file" accept=".pdf,.docx,.pptx,.txt,.md,text/plain" className="hidden" onChange={handleFile} disabled={fileLoading} />
            </label>
            <label className={`inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted ${imgLoading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              {imgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {imgLoading ? "Reading image…" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imgLoading} />
            </label>
          </div>
        </div>
      </div>

      {/* Library */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Your sets</h2>
          {(folders?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              <FilterChip active={folderFilter === "all"} onClick={() => setFolderFilter("all")}>All</FilterChip>
              <FilterChip active={folderFilter === "none"} onClick={() => setFolderFilter("none")}>Unfiled</FilterChip>
              {folders!.map((f) => (
                <FilterChip key={f.id} active={folderFilter === f.id} onClick={() => setFolderFilter(f.id)}>
                  <Folder className="h-3.5 w-3.5" /> {f.name}
                </FilterChip>
              ))}
            </div>
          )}
        </div>
        {!visibleSets || visibleSets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            <Layers className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">No flashcard sets here yet. Generate a deck above or create your own!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSets.map((s) => {
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
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {s.subject && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent-foreground">{s.subject}</span>}
                    <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{s.difficulty}</span>
                    <span>{cardCount} cards</span>
                    {s.is_public && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"><Globe className="h-3 w-3" /> Public</span>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="soft" className="flex-1"><Link to="/study/$setId" params={{ setId: s.id }}>Study</Link></Button>
                    <Button asChild variant="outline" size="icon" aria-label="Edit"><Link to="/editor/$setId" params={{ setId: s.id }}><Pencil className="h-4 w-4" /></Link></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? "bg-brand text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
