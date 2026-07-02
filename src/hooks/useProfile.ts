import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { AgeGroup } from "@/lib/gamification";

export type Profile = {
  id: string;
  display_name: string | null;
  age_group: AgeGroup;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
};

export function useProfile() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, age_group, xp, level, current_streak, longest_streak, last_study_date")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });

  // Apply the age-based theme to the document.
  useEffect(() => {
    const age = query.data?.age_group;
    if (age && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-age", age);
    }
  }, [query.data?.age_group]);

  return query;
}
