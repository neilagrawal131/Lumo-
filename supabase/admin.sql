-- ============================================================================
-- Etude — secure role/admin system. Paste into Supabase SQL Editor and Run.
-- Safe to re-run. Roles live in their own table; users can read only their own
-- role and can never change it — only admins can, enforced by RLS.
-- ============================================================================

-- Role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Roles table (separate from profiles so users can't edit their own role)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Admin check as SECURITY DEFINER so RLS policies can call it without recursion
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'admin'); $$;

-- Policies: a user may READ only their own role; admins may read all and manage all.
-- There is deliberately NO policy letting a user INSERT/UPDATE/DELETE their own
-- role, so self-promotion to admin is impossible.
DROP POLICY IF EXISTS "read own role" ON public.user_roles;
CREATE POLICY "read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Suspension flag for accounts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Signup trigger also creates a role row (seed the initial admin by email)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, age_group)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'age_group')::public.age_group, 'adults')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email = 'neil.agrawal131@gmail.com' THEN 'admin' ELSE 'user' END::public.app_role
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Backfill: give every existing user a role row (default 'user')…
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- …then promote the initial admin.
UPDATE public.user_roles SET role = 'admin'
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'neil.agrawal131@gmail.com');
