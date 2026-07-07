import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Library, Plus, Sparkles, Folder, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudySetCard } from "@/components/StudySetCard";

export const Route = createFileRoute("/_authenticated/sets")({
  component: StudySetsPage,
});

function StudySetsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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
        .select("id, title, subject, difficulty, is_public, is_manual, folder_id, created_at, flashcards(count)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function deleteSet(id: string) {
    await supabase.from("flashcard_sets").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["all-sets"] });
    toast.success("Set deleted");
  }

  const q = search.trim().toLowerCase();
  const visibleSets = (sets ?? [])
    .filter((s) => (folderFilter === "all" ? true : folderFilter === "none" ? !s.folder_id : s.folder_id === folderFilter))
    .filter((s) => (!q ? true : `${s.title} ${s.subject ?? ""}`.toLowerCase().includes(q)));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Library className="h-7 w-7 text-primary" /> Study Sets
          </h1>
          <p className="mt-1 text-muted-foreground">
            Every set you've made. Hit <span className="font-medium text-foreground">Study</span> on any of them to open flashcards, quizzes, matching, a study guide and more.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="hero"><Link to="/flashcards"><Sparkles className="h-4 w-4" /> Generate with AI</Link></Button>
          <Button asChild variant="outline"><Link to="/create"><Plus className="h-4 w-4" /> Create your own</Link></Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your sets…" className="pl-9" />
        </div>
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

      {visibleSets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Library className="mx-auto h-8 w-8 opacity-50" />
          <p className="mt-2">{sets && sets.length > 0 ? "No sets match your search." : "No study sets yet — generate one with AI or create your own!"}</p>
          {(!sets || sets.length === 0) && (
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild variant="hero"><Link to="/flashcards"><Sparkles className="h-4 w-4" /> Generate with AI</Link></Button>
              <Button asChild variant="soft"><Link to="/create"><Plus className="h-4 w-4" /> Create your own</Link></Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSets.map((s) => (
            <StudySetCard
              key={s.id}
              set={{
                id: s.id,
                title: s.title,
                subject: s.subject,
                difficulty: s.difficulty,
                is_public: s.is_public,
                cardCount: (s.flashcards as { count: number }[] | null)?.[0]?.count ?? 0,
              }}
              onDelete={deleteSet}
            />
          ))}
        </div>
      )}
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
