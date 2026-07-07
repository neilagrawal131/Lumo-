-- ============================================================================
-- Etude — Friends & study-set sharing. Paste into Supabase SQL Editor and Run.
-- Safe to re-run. RLS-enforced: users only see their own friendships/shares,
-- and can only read sets that were explicitly shared with them.
-- ============================================================================

-- Friendships (request -> accepted)
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = a AND f.addressee_id = b) OR (f.requester_id = b AND f.addressee_id = a))
  );
$$;

DROP POLICY IF EXISTS "view own friendships" ON public.friendships;
CREATE POLICY "view own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
DROP POLICY IF EXISTS "send friend request" ON public.friendships;
CREATE POLICY "send friend request" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "respond to request" ON public.friendships;
CREATE POLICY "respond to request" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id) WITH CHECK (auth.uid() = addressee_id);
DROP POLICY IF EXISTS "remove friendship" ON public.friendships;
CREATE POLICY "remove friendship" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Set shares
CREATE TABLE IF NOT EXISTS public.set_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id uuid NOT NULL REFERENCES public.flashcard_sets ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  shared_with_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, shared_with_id)
);
GRANT SELECT, INSERT, DELETE ON public.set_shares TO authenticated;
GRANT ALL ON public.set_shares TO service_role;
ALTER TABLE public.set_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view own shares" ON public.set_shares;
CREATE POLICY "view own shares" ON public.set_shares FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);
DROP POLICY IF EXISTS "owner shares set" ON public.set_shares;
CREATE POLICY "owner shares set" ON public.set_shares FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (SELECT 1 FROM public.flashcard_sets s WHERE s.id = set_id AND s.user_id = auth.uid())
    AND public.are_friends(auth.uid(), shared_with_id)
  );
DROP POLICY IF EXISTS "owner unshares set" ON public.set_shares;
CREATE POLICY "owner unshares set" ON public.set_shares FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Recipients may read the sets (and their cards) that were shared with them
DROP POLICY IF EXISTS "view sets shared with me" ON public.flashcard_sets;
CREATE POLICY "view sets shared with me" ON public.flashcard_sets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.set_shares sh WHERE sh.set_id = id AND sh.shared_with_id = auth.uid()));
DROP POLICY IF EXISTS "view cards of shared sets" ON public.flashcards;
CREATE POLICY "view cards of shared sets" ON public.flashcards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.set_shares sh WHERE sh.set_id = flashcards.set_id AND sh.shared_with_id = auth.uid()));

-- Friends may view each other's basic profile (names on the friends list)
DROP POLICY IF EXISTS "friends view profile" ON public.profiles;
CREATE POLICY "friends view profile" ON public.profiles FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), id));
