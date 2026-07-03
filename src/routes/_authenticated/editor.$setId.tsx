import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Plus, Trash2, Copy, ArrowUp, ArrowDown, ImagePlus, X,
  Check, Cloud, Globe, Lock, Share2, Sparkles, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { uploadFlashcardImage } from "@/lib/flashcard-images";
import { generateQuiz } from "@/lib/ai.functions";
import { awardBadge } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/editor/$setId")({
  component: EditorPage,
});

type CardDraft = {
  id: string;
  front: string;
  back: string;
  image_url: string | null;
};

function newCard(): CardDraft {
  return { id: crypto.randomUUID(), front: "", back: "", image_url: null };
}

function EditorPage() {
  const { setId } = Route.useParams();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const genQuiz = useServerFn(generateQuiz);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [cards, setCards] = useState<CardDraft[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [quizzing, setQuizzing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const loaded = useRef(false);
  const deletedIds = useRef<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["editor-set", setId],
    queryFn: async () => {
      const { data: set } = await supabase
        .from("flashcard_sets")
        .select("id, title, subject, is_public, share_slug")
        .eq("id", setId)
        .single();
      const { data: rows } = await supabase
        .from("flashcards")
        .select("id, front, back, image_url")
        .eq("set_id", setId)
        .order("position");
      return { set, cards: rows ?? [] };
    },
  });

  // Hydrate local state once.
  useEffect(() => {
    if (data?.set && !loaded.current) {
      setTitle(data.set.title ?? "");
      setSubject(data.set.subject ?? "");
      setIsPublic(data.set.is_public ?? false);
      setShareSlug(data.set.share_slug ?? null);
      setCards(
        data.cards.length
          ? data.cards.map((c) => ({ id: c.id, front: c.front, back: c.back, image_url: c.image_url }))
          : [newCard(), newCard()],
      );
      loaded.current = true;
    }
  }, [data]);

  // Debounced autosave whenever anything changes.
  useEffect(() => {
    if (!loaded.current) return;
    setStatus("saving");
    const t = setTimeout(() => void persist(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subject, isPublic, cards]);

  async function persist() {
    try {
      await supabase
        .from("flashcard_sets")
        .update({ title: title.trim() || "Untitled set", subject: subject.trim() || null, is_public: isPublic })
        .eq("id", setId);

      if (deletedIds.current.length) {
        await supabase.from("flashcards").delete().in("id", deletedIds.current);
        deletedIds.current = [];
      }

      const rows = cards.map((c, i) => ({
        id: c.id,
        set_id: setId,
        user_id: user!.id,
        front: c.front,
        back: c.back,
        image_url: c.image_url,
        position: i,
      }));
      if (rows.length) await supabase.from("flashcards").upsert(rows);
      setStatus("saved");
    } catch {
      toast.error("Couldn't save changes");
      setStatus("idle");
    }
  }

  function updateCard(id: string, patch: Partial<CardDraft>) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function addCard() {
    setCards((cs) => [...cs, newCard()]);
  }
  function duplicateCard(id: string) {
    setCards((cs) => {
      const i = cs.findIndex((c) => c.id === id);
      if (i < 0) return cs;
      const copy = { ...cs[i], id: crypto.randomUUID() };
      return [...cs.slice(0, i + 1), copy, ...cs.slice(i + 1)];
    });
  }
  function deleteCard(id: string) {
    deletedIds.current.push(id);
    setCards((cs) => cs.filter((c) => c.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    setCards((cs) => {
      const i = cs.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleImage(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setUploadingId(id);
    try {
      const url = await uploadFlashcardImage(user!.id, file);
      updateCard(id, { image_url: url });
      toast.success("Image added");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploadingId(null);
    }
  }

  async function copyShareLink() {
    if (!shareSlug) return;
    const url = `${window.location.origin}/shared/${shareSlug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  }

  async function handleGenerateQuiz() {
    const valid = cards.filter((c) => c.front.trim() && c.back.trim());
    if (valid.length < 3) {
      toast.error("Add at least 3 complete cards to generate a quiz.");
      return;
    }
    setQuizzing(true);
    try {
      await persist();
      const topic = (`Create a quiz from these study cards for the topic "${title}".\n\n` +
        valid.map((c) => `Q: ${c.front}\nA: ${c.back}`).join("\n\n")).slice(0, 4000);
      const result = await genQuiz({
        data: {
          topic,
          count: Math.min(valid.length, 10),
          difficulty: "medium",
          ageGroup: profile?.age_group ?? "adults",
        },
      });
      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({
          user_id: user!.id,
          title: result.title || `${title} quiz`,
          topic: title.slice(0, 200),
          questions: result.questions,
          age_group: profile?.age_group ?? "adults",
        })
        .select("id")
        .single();
      if (error || !quiz) throw error ?? new Error("Could not save quiz");
      await awardBadge(user!.id, "first_quiz");
      queryClient.invalidateQueries();
      toast.success("Quiz generated from your cards!");
      navigate({ to: "/quizzes" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Quiz generation failed");
    } finally {
      setQuizzing(false);
    }
  }

  if (isLoading || !loaded.current) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/flashcards"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {status === "saving" ? (
            <><Cloud className="h-4 w-4 animate-pulse" /> Saving…</>
          ) : status === "saved" ? (
            <><Check className="h-4 w-4 text-success" /> Saved</>
          ) : null}
        </span>
      </div>

      {/* Set details */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Study set title" className="text-lg font-semibold" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Biology" />
          </div>
          <div className="space-y-2">
            <Label>Sharing</Label>
            <div className="flex h-10 items-center gap-3 rounded-xl border border-input bg-background px-3">
              {isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <span className="flex-1 text-sm">{isPublic ? "Public" : "Private"}</span>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
        </div>
        {isPublic && (
          <Button variant="soft" size="sm" onClick={copyShareLink}>
            <Share2 className="h-4 w-4" /> Copy share link
          </Button>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{cards.length} card{cards.length === 1 ? "" : "s"}</h2>
        </div>

        {cards.map((card, i) => (
          <div key={card.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Card {i + 1}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(card.id, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(card.id, 1)} disabled={i === cards.length - 1} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateCard(card.id)} aria-label="Duplicate"><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteCard(card.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Front (question / term)</Label>
                <Textarea rows={3} value={card.front} onChange={(e) => updateCard(card.id, { front: e.target.value })} placeholder="e.g. What is photosynthesis?" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Back (answer)</Label>
                <Textarea rows={3} value={card.back} onChange={(e) => updateCard(card.id, { back: e.target.value })} placeholder="e.g. The process plants use to convert light into energy." />
              </div>
            </div>
            <div className="mt-3">
              {card.image_url ? (
                <div className="relative inline-block">
                  <img src={card.image_url} alt="Flashcard" className="max-h-40 rounded-lg border border-border" />
                  <button
                    onClick={() => updateCard(card.id, { image_url: null })}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted">
                  {uploadingId === card.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploadingId === card.id ? "Uploading…" : "Add image"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(card.id, e)} />
                </label>
              )}
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addCard}><Plus className="h-4 w-4" /> Add card</Button>
      </div>

      {/* Actions */}
      <div className="sticky bottom-4 flex flex-wrap gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-elegant backdrop-blur">
        <Button asChild variant="soft"><Link to="/study/$setId" params={{ setId }}><BookOpen className="h-4 w-4" /> Study</Link></Button>
        <Button variant="hero" onClick={handleGenerateQuiz} disabled={quizzing} className="flex-1 sm:flex-none">
          {quizzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {quizzing ? "Generating…" : "Generate Quiz"}
        </Button>
      </div>
    </div>
  );
}
