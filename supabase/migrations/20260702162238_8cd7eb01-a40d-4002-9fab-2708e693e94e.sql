
CREATE TYPE public.age_group AS ENUM ('kids', 'teens', 'college', 'adults');
CREATE TYPE public.difficulty AS ENUM ('easy', 'medium', 'hard');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  age_group public.age_group NOT NULL DEFAULT 'adults',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- FLASHCARD SETS
CREATE TABLE public.flashcard_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  description TEXT,
  difficulty public.difficulty NOT NULL DEFAULT 'medium',
  age_group public.age_group NOT NULL DEFAULT 'adults',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_sets TO authenticated;
GRANT ALL ON public.flashcard_sets TO service_role;
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sets" ON public.flashcard_sets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FLASHCARDS
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.flashcard_sets ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 0,
  ease REAL NOT NULL DEFAULT 2.5,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  review_count INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cards" ON public.flashcards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- QUIZZES
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  difficulty public.difficulty NOT NULL DEFAULT 'medium',
  age_group public.age_group NOT NULL DEFAULT 'adults',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- QUIZ ATTEMPTS
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BADGES
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own badges" ON public.badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STUDY SESSIONS
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL,
  detail TEXT,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sets_updated BEFORE UPDATE ON public.flashcard_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, age_group)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'age_group')::public.age_group, 'adults')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
