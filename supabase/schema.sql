-- ============================================================
-- Vocalii Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Profiles (extends auth.users — one row per user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name           TEXT NOT NULL DEFAULT '',
  last_name            TEXT NOT NULL DEFAULT '',
  role                 TEXT,
  experience_level     TEXT,
  goals                TEXT[] DEFAULT '{}',
  symptoms             TEXT[] DEFAULT '{}',
  desired_voice_traits TEXT[] DEFAULT '{}',
  voice_barrier        TEXT,
  voice_identity       TEXT,
  baseline_set_at      TIMESTAMPTZ,
  onboarding_complete  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If this table already exists in your Supabase project, run this instead of the CREATE TABLE above:
-- ALTER TABLE public.profiles
--   ADD COLUMN IF NOT EXISTS voice_barrier TEXT,
--   ADD COLUMN IF NOT EXISTS baseline_set_at TIMESTAMPTZ,
--   ADD COLUMN IF NOT EXISTS desired_voice_traits TEXT[] DEFAULT '{}';

-- Habit pairs chosen during onboarding
CREATE TABLE IF NOT EXISTS public.habit_pairs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_habit TEXT NOT NULL,
  vocal_habit TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily check-ins (one per user per calendar day)
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date         DATE NOT NULL,
  vocal_effort INTEGER NOT NULL CHECK (vocal_effort >= 1 AND vocal_effort <= 10),
  symptoms     TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Ritual completions (per user, per day, per ritual)
CREATE TABLE IF NOT EXISTS public.ritual_completions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       DATE NOT NULL,
  ritual_id  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date, ritual_id)
);

-- Vocal analysis reports
CREATE TABLE IF NOT EXISTS public.vocal_reports (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT,
  ritual_name     TEXT NOT NULL,
  category        TEXT NOT NULL,
  date            TEXT NOT NULL,
  duration        TEXT NOT NULL,
  fatigue_level   INTEGER NOT NULL,
  feelings        TEXT[] DEFAULT '{}',
  notes           TEXT NOT NULL DEFAULT '',
  insight         TEXT NOT NULL DEFAULT '',
  pitch_hz        NUMERIC,
  pitch_range_hz  NUMERIC,
  resonance_score NUMERIC,
  clarity_pct     NUMERIC,
  is_favourite    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily habit-pair completions (marked during the check-in flow)
CREATE TABLE IF NOT EXISTS public.habit_completions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  daily_habit TEXT NOT NULL,
  vocal_habit TEXT NOT NULL,
  completed   BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date, daily_habit, vocal_habit)
);

-- Upcoming vocal events (rehearsals, performances, appointments, etc.)
CREATE TABLE IF NOT EXISTS public.events (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  date       DATE NOT NULL,
  time       TEXT,
  location   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security — users can only access their own data
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_pairs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocal_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- all other tables: full CRUD on own rows
CREATE POLICY "habit_pairs_all"        ON public.habit_pairs        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "daily_checkins_all"     ON public.daily_checkins     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ritual_completions_all" ON public.ritual_completions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "vocal_reports_all"      ON public.vocal_reports      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "events_all"             ON public.events             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "habit_completions_all"  ON public.habit_completions  FOR ALL USING (auth.uid() = user_id);
