import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Reads the current user's role (RLS lets them read only their own). Used for
// showing/hiding admin UI — real enforcement is in the admin server functions.
export function useRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["role", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return (data?.role as "user" | "admin" | undefined) ?? "user";
    },
  });
}
