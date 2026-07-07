-- ============================================================================
-- Etude — security hardening. Paste into Supabase SQL Editor and Run.
-- Safe to re-run. Makes the paywall and subscription/role state tamper-proof.
-- ============================================================================

-- 1) Sensitive profile columns may NOT be changed by users — only the backend
--    (service role) may write them. Column-level privileges enforce this even
--    though the row-level policy lets a user edit their own profile.
REVOKE UPDATE (plan, subscription_status, stripe_customer_id, stripe_subscription_id, plan_renews_at, suspended)
  ON public.profiles FROM authenticated;

-- 2) Enforce the free-plan study-set limit in the database, so it can't be
--    bypassed from the client/API.
CREATE OR REPLACE FUNCTION public.enforce_free_set_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_plan text;
  cnt int;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE id = NEW.user_id;
  IF COALESCE(user_plan, 'free') <> 'premium' THEN
    SELECT count(*) INTO cnt FROM public.flashcard_sets WHERE user_id = NEW.user_id;
    IF cnt >= 10 THEN
      RAISE EXCEPTION 'Free plan is limited to 10 study sets. Upgrade to Premium for unlimited.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_free_set_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_free_set_limit ON public.flashcard_sets;
CREATE TRIGGER trg_free_set_limit BEFORE INSERT ON public.flashcard_sets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_set_limit();
