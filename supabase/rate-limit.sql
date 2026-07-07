-- ============================================================================
-- Etude — per-user AI rate limiting. Paste into Supabase SQL Editor and Run.
-- Safe to re-run. Caps how many AI generations each user can make per day so a
-- single account can't run up your provider bill or exhaust the shared API key.
-- Free users get a modest daily allowance; Premium users get a much larger one.
-- ============================================================================

-- Per-user, per-day counter. Only the SECURITY DEFINER function below (and the
-- service role) ever touch this table, so RLS is on with no policies.
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Atomically add `p_cost` to today's counter and reject if it goes over the
-- caller's daily limit. Runs as the caller (auth.uid()); if the limit is hit the
-- RAISE rolls back the increment, so a blocked request doesn't consume quota.
-- Tune the two numbers below to taste.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(p_cost int DEFAULT 1)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  user_plan text;
  lim int;
  today date := (now() AT TIME ZONE 'utc')::date;
  new_count int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT plan INTO user_plan FROM public.profiles WHERE id = uid;
  lim := CASE WHEN COALESCE(user_plan, 'free') = 'premium' THEN 500 ELSE 40 END;

  INSERT INTO public.ai_usage (user_id, day, count)
    VALUES (uid, today, p_cost)
    ON CONFLICT (user_id, day) DO UPDATE SET count = public.ai_usage.count + p_cost
    RETURNING count INTO new_count;

  IF new_count > lim THEN
    RAISE EXCEPTION 'AI daily limit reached (% requests). Upgrade to Premium for a much higher limit, or try again tomorrow.', lim
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_ai_quota(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(int) TO authenticated;
