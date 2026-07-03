-- Folders for organizing study sets
CREATE TABLE public.folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'primary',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folders" ON public.folders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend flashcard_sets with organization + sharing
ALTER TABLE public.flashcard_sets
  ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  ADD COLUMN subject text,
  ADD COLUMN is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN share_slug text UNIQUE DEFAULT gen_random_uuid()::text;

-- Extend flashcards with an optional image
ALTER TABLE public.flashcards
  ADD COLUMN image_url text;

-- Public (anon + authenticated) read access to shared sets and their cards
CREATE POLICY "Anyone can view public sets" ON public.flashcard_sets
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Anyone can view cards of public sets" ON public.flashcards
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flashcard_sets s
    WHERE s.id = flashcards.set_id AND s.is_public = true
  ));