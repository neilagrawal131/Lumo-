import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { isPremium } from "@/lib/plans";

export function Logo({ className = "" }: { className?: string }) {
  const { data: profile } = useProfile();
  return (
    <Link to="/" className={`flex items-center gap-2 font-display font-bold ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-primary-foreground shadow-elegant">
        <BookOpen className="h-5 w-5" />
      </span>
      <span className="text-xl tracking-tight">Etude</span>
      {isPremium(profile?.plan) && (
        <span className="text-premium text-xs font-bold uppercase tracking-widest">Premium</span>
      )}
    </Link>
  );
}
