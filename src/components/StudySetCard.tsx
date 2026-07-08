import { Link } from "@tanstack/react-router";
import { Layers, Trash2, Pencil, Globe, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareSetDialog } from "@/components/ShareSetDialog";

export type StudySetSummary = {
  id: string;
  title: string;
  subject?: string | null;
  difficulty?: string | null;
  is_public?: boolean | null;
  cardCount?: number;
};

export function StudySetCard({ set, onDelete }: { set: StudySetSummary; onDelete?: (id: string) => void }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-elegant">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Layers className="h-5 w-5" />
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(set.id)}
            aria-label="Delete set"
            className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <h3 className="mt-4 line-clamp-2 font-semibold">{set.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {set.subject && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent-foreground">{set.subject}</span>}
        {set.difficulty && <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{set.difficulty}</span>}
        {typeof set.cardCount === "number" && <span>{set.cardCount} cards</span>}
        {set.is_public && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
            <Globe className="h-3 w-3" /> Public
          </span>
        )}
      </div>
      <div className="mt-4 flex gap-2 pt-2">
        <Button asChild variant="soft" className="flex-1">
          <Link to="/study/$setId" params={{ setId: set.id }}>
            <GraduationCap className="h-4 w-4" /> Study
          </Link>
        </Button>
        <ShareSetDialog setId={set.id} setTitle={set.title} />
        <Button asChild variant="outline" size="icon" aria-label="Edit">
          <Link to="/editor/$setId" params={{ setId: set.id }}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
