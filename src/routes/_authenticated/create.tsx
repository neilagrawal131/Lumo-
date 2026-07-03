import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, PenLine, FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/create")({
  component: CreateSetPage,
});

function CreateSetPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [folderId, setFolderId] = useState<string>("");
  const [newFolder, setNewFolder] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: folders, refetch } = useQuery({
    queryKey: ["folders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("folders")
        .select("id, name")
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  async function addFolder() {
    if (!newFolder.trim()) return;
    const { data, error } = await supabase
      .from("folders")
      .insert({ user_id: user!.id, name: newFolder.trim() })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Could not create folder");
      return;
    }
    setNewFolder("");
    await refetch();
    setFolderId(data.id);
    toast.success("Folder created");
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Give your study set a title first.");
      return;
    }
    setCreating(true);
    try {
      const { data: set, error } = await supabase
        .from("flashcard_sets")
        .insert({
          user_id: user!.id,
          title: title.trim(),
          subject: subject.trim() || null,
          folder_id: folderId || null,
          is_manual: true,
          age_group: profile?.age_group ?? "adults",
        })
        .select("id")
        .single();
      if (error || !set) throw error ?? new Error("Could not create set");
      navigate({ to: "/editor/$setId", params: { setId: set.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create set");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/flashcards"><ArrowLeft className="h-4 w-4" /> Back to flashcards</Link>
      </Button>

      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <PenLine className="h-7 w-7 text-primary" /> Create a study set
        </h1>
        <p className="mt-1 text-muted-foreground">Build your own flashcards from scratch — then study or turn them into a quiz.</p>
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Spanish verbs — Unit 3" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject (optional)</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Spanish, Biology, History" />
        </div>
        <div className="space-y-2">
          <Label>Folder (optional)</Label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">No folder</option>
            {folders?.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            <Input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="New folder name" />
            <Button type="button" variant="outline" onClick={addFolder}><FolderPlus className="h-4 w-4" /> Add</Button>
          </div>
        </div>

        <Button variant="hero" size="lg" onClick={handleCreate} disabled={creating} className="w-full">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          {creating ? "Creating…" : "Create & add cards"}
        </Button>
      </div>
    </div>
  );
}
