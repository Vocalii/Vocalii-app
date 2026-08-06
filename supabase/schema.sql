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
  voice_statement      TEXT,
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
--   ADD COLUMN IF NOT EXISTS desired_voice_traits TEXT[] DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS voice_statement TEXT;

-- Baseline voice-metric columns (assumed by application code; formalized here)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS baseline_score NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_stability_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_resonance_score NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_clarity_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_loudness_db NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_pitch_hz NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_pitch_range_hz NUMERIC;

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
  voice_demand_level INTEGER CHECK (voice_demand_level >= 1 AND voice_demand_level <= 5),
  symptoms     TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- If this table already exists in your Supabase project, run this instead of the CREATE TABLE above:
-- ALTER TABLE public.daily_checkins
--   ADD COLUMN IF NOT EXISTS voice_demand_level INTEGER CHECK (voice_demand_level >= 1 AND voice_demand_level <= 5);

ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS voice_confidence INTEGER CHECK (voice_confidence >= 1 AND voice_confidence <= 5),
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_area TEXT NOT NULL DEFAULT '', -- single required selection (superseded support_areas TEXT[])
  ADD COLUMN IF NOT EXISTS selected_ritual_ids TEXT[] DEFAULT '{}', -- set once by selectRituals right after this check-in; resets whenever the row does
  ADD COLUMN IF NOT EXISTS ritual_insight TEXT NOT NULL DEFAULT ''; -- short AI (or fallback) explanation of why these rituals were picked

ALTER TABLE public.daily_checkins DROP COLUMN IF EXISTS support_areas;

-- Ritual completions (per user, per day, per ritual)
CREATE TABLE IF NOT EXISTS public.ritual_completions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date              DATE NOT NULL,
  ritual_id         TEXT NOT NULL,
  feeling_rating    INTEGER CHECK (feeling_rating BETWEEN 0 AND 10),
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 0 AND 10), -- higher = harder; inverted (10 - value) when scoring
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

-- If this table already exists in your Supabase project, run this instead of the CREATE TABLE above:
-- ALTER TABLE public.vocal_reports
--   ADD COLUMN IF NOT EXISTS loudness_db NUMERIC,
--   ADD COLUMN IF NOT EXISTS stability_pct NUMERIC;

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
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title                TEXT NOT NULL,
  date                 DATE NOT NULL,
  time                 TEXT,
  location             TEXT,
  prep_days_before     INTEGER CHECK (prep_days_before BETWEEN 1 AND 7),
  tailored_ritual_ids  TEXT[] DEFAULT '{}',
  ai_insight           TEXT,
  chat_transcript      JSONB DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If this table already exists in your Supabase project, run this instead of the CREATE TABLE above:
-- ALTER TABLE public.events
--   ADD COLUMN IF NOT EXISTS prep_days_before INTEGER CHECK (prep_days_before BETWEEN 1 AND 7),
--   ADD COLUMN IF NOT EXISTS tailored_ritual_ids TEXT[] DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS ai_insight TEXT,
--   ADD COLUMN IF NOT EXISTS chat_transcript JSONB DEFAULT '[]';

-- Daily/weekly goal-progress status snapshots (one row per user/day/goal, write-only
-- traceability log for the goal-progress rule engine — see src/lib/goalProgress.ts)
CREATE TABLE IF NOT EXISTS public.goal_progress_snapshots (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date                 DATE NOT NULL,
  goal                 TEXT NOT NULL,
  status               TEXT NOT NULL,
  rule_version         TEXT NOT NULL,
  primary_value        NUMERIC,
  primary_value_prior  NUMERIC,
  observations_count   INTEGER,
  safety_triggered     BOOLEAN NOT NULL DEFAULT FALSE,
  details              JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date, goal)
);

-- Once-a-week reflection: 2 questions tied to the user's selected goal, 2 tied to their
-- selected trait, 1 universal confidence question, plus an optional free-text reflection.
-- See src/lib/weeklyCheckin.ts for the question text and week_start computation.
CREATE TABLE IF NOT EXISTS public.weekly_checkins (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start        DATE NOT NULL,
  goal_id           TEXT NOT NULL,
  goal_question_1   INTEGER CHECK (goal_question_1 BETWEEN 0 AND 10),
  goal_question_2   INTEGER CHECK (goal_question_2 BETWEEN 0 AND 10), -- reverse-scored for build_endurance/improve_clarity — see REVERSE_SCORED_GOALS in src/lib/weeklyCheckin.ts; raw value stored here, invert only when scoring
  trait             TEXT NOT NULL,
  trait_question_1  INTEGER CHECK (trait_question_1 BETWEEN 0 AND 10),
  trait_question_2  INTEGER CHECK (trait_question_2 BETWEEN 0 AND 10),
  voice_confidence  INTEGER CHECK (voice_confidence BETWEEN 0 AND 10),
  reflection        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Cached AI-generated weekly report insight — generated once per (user, week_start) the first
-- time WeeklyReportPage.tsx is viewed that week, then reused on every later visit so the report
-- stays static for the rest of the week instead of regenerating (and re-calling Claude) each time.
-- week_start here is the Monday of the *current* Mon-Sun week (computeWeekDates()'s week), which
-- is a different "week" concept than weekly_checkins.week_start (the most recently *concluded*
-- week) — intentionally not reusing that table.
CREATE TABLE IF NOT EXISTS public.weekly_report_insights (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start      DATE NOT NULL,
  overview        TEXT NOT NULL,
  what_improved   TEXT NOT NULL,
  needs_attention TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
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
ALTER TABLE public.goal_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_report_insights ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "goal_progress_snapshots_all" ON public.goal_progress_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "weekly_checkins_all" ON public.weekly_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "weekly_report_insights_all" ON public.weekly_report_insights FOR ALL USING (auth.uid() = user_id);
