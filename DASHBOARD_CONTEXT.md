# Vocalii Dashboard — Technical Context (as of 2026-08-04)

Handoff doc describing what's on the dashboard ("home" view) and how it's wired up. For another chat/agent that needs to work on this page without re-deriving everything from source.

## Stack

- React + TypeScript, Vite, Tailwind (utility classes inline, no CSS modules)
- `motion/react` (Framer Motion successor) for modals/transitions
- `lucide-react` for icons
- Supabase (Postgres + Auth) as the only backend — no custom API server for app data (server.ts exists but is separate/unrelated to this data flow)
- All dashboard state lives in `src/App.tsx` (~1000 lines) — a single "god component" that owns all Supabase reads/writes and passes data + callbacks down as props. No React Query/SWR, no context providers, no Redux — just `useState`/`useEffect` in App.tsx.

## Top-level flow (`src/App.tsx`)

1. On mount, checks Supabase auth session (`supabase.auth.getSession()` + `onAuthStateChange` listener).
2. If authenticated, `loadUserData(uid)` fires 7 parallel Supabase queries (`Promise.all`): `profiles`, `habit_pairs`, `daily_checkins` (today only), `ritual_completions` (today only), `vocal_reports` (all), `events` (all), `habit_completions` (last 7 days).
3. Maps DB snake_case rows to camelCase TS types (`mapReport`, `mapEvent` helpers) and dumps everything into ~20 individual `useState` slices (userName, goals, baselineScore, reports, events, etc.) — not a single normalized state object.
4. If `profile.onboarding_complete` is false, renders `OnboardingFlow` instead of the dashboard.
5. There's also a "quick preview bypass" (`handleBypass`) that skips auth entirely and lets someone click through onboarding without a Supabase account — data just lives in React state, nothing persisted.
6. `currentView` state (`'home' | 'rituals' | 'reports' | 'weekly-report' | 'profile'`) switches between full-page views. The dashboard described below is the `'home'` view.

## Dashboard ("home" view) layout

Rendered inside a `grid-cols-12` container (`App.tsx:848`), split into a left 8-col column and right 4-col column.

**Left column (`lg:col-span-8`):**
- `HeroSection` — greeting/header card, has a button that navigates to `weekly-report` view
- `InteractiveMap` (imported as `VoiceHealthStatus` component) — "Performance Statistics" section, takes `vocalData` (today's effort/confidence/symptoms/checkInDone)
- `WeatherWidget` — despite the name, this is actually an "OMNI-Voice Confidence" arc gauge (0-5), not weather. Pure presentational SVG arc, no data fetching — takes `confidence` as a prop (today's `voice_confidence` from `daily_checkins`). Renders empty state "Complete daily check-in" if null.
- `BaselineCard` — compares baseline voice metrics (set during onboarding/reports flow) vs. most recent report's metrics
- `DashboardConsistencyChart` — takes `userId` and `dailyRitualIds`, presumably queries its own consistency data (not read yet, worth checking if touching this)

**Right column (`lg:col-span-4`):**
- `HabitCard` ("Your Habits") — shows the user's paired daily+vocal habits (from `habit_pairs` table). Has an edit pencil button that opens a modal using `HabitPairPicker` to reassign pairs, saves via `onSave` → `App.handleUpdateProfile({ habitPairs })`.
- A static "Weekly Report" preview tile (hardcoded date range/numbers "Jun 23 – Jun 29" / "6/7 check-ins · 19/21 rituals" — **not wired to real data**, just navigates to `weekly-report` view on click)
- `UpcomingEventsCard` — list of events sorted by date, "Active" prep badge if within `prepDaysBefore` window of an event. Add button opens `EventCreationFlow` (multi-step: details → AI chat → prep plan). Click an event opens a simple edit/delete modal (title/date/time/location only — editing doesn't touch `tailoredRitualIds`/`aiInsight`/`chatTranscript`).

Three modals overlay the whole page regardless of view: info modal ("About Vocalii"), favorites modal (legacy from an old travel-app template — destinations/favorites, unrelated to voice coaching), and an empty settings modal (just a close button, no actual settings yet).

## Data model (Supabase — see `supabase/schema.sql`, `src/lib/supabase.ts`)

All tables have `user_id` FK to `auth.users`, RLS enabled with `auth.uid() = user_id` policies (owner-only access).

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | 1 row/user, onboarding answers + baseline metrics | `onboarding_complete`, `role`, `experience_level`, `goals[]`, `voice_barrier`, `baseline_score`, `baseline_stability_pct`, `baseline_resonance_score`, `baseline_clarity_pct`, `baseline_loudness_db`, `baseline_pitch_hz`, `baseline_pitch_range_hz`, `baseline_set_at` |
| `habit_pairs` | user's chosen daily-habit ↔ vocal-habit pairings, ordered | `daily_habit`, `vocal_habit`, `sort_order` |
| `daily_checkins` | one per user per day | `vocal_effort` (1-10), `voice_confidence`, `symptoms[]` — unique on `(user_id, date)` |
| `ritual_completions` | which ritual IDs completed today | unique on `(user_id, date, ritual_id)` |
| `habit_completions` | which habit pairs checked off, per day | unique on `(user_id, date, daily_habit, vocal_habit)` |
| `vocal_reports` | voice analysis session records | pitch/resonance/clarity/loudness/stability metrics, `is_favourite` |
| `events` | upcoming rehearsals/performances | `prep_days_before` (1-7), `tailored_ritual_ids[]`, `ai_insight`, `chat_transcript` (JSONB array of `{role, content}`) |

Note: `src/lib/supabase.ts`'s typed `Database` interface for `vocal_reports` is missing `loudness_db` and `stability_pct` in the type definition even though `App.tsx`'s `mapReport`/`handleAddReport` read/write them — the DB schema also doesn't show `loudness_db`/`stability_pct` columns in `schema.sql` (may have been added via a later untracked migration). Worth reconciling if touching reports.

## Ritual / habit "daily plan" logic

- `EXERCISE_RITUALS` (from `src/ritualsData.ts`) is the static catalog of all rituals (id, name, category, duration, difficulty, instructions, benefits).
- `DEFAULT_DAILY_RITUAL_IDS` = 3 hardcoded ritual IDs used when no event prep is active.
- `activePrepEvent`: computed in `App.tsx` by finding the nearest upcoming event whose prep window (`event.date - prepDaysBefore` through `event.date`) contains today. If found, that event's `tailoredRitualIds` override the default daily rituals for both the dashboard consistency chart and the Rituals page.
- A `useEffect` fires a one-time local notification when prep mode starts for a new event (dedup via `localStorage['vocalii_prep_notified_event_id']`).

## Notifications

Ephemeral, client-only — stored in `localStorage['vocalii_notifications']`, capped at 20 entries. Not persisted to Supabase. Triggered on: report saved, event created, check-in completed (via `postCheckInTrigger` from `src/lib/notificationTriggers.ts`), baseline set, prep mode start.

## Known rough edges / things to know before changing this page

- App.tsx is doing too much — all data fetching, mapping, and mutation handlers for the entire app live in one file with no separation (no custom hooks per domain, no service layer).
- The "Weekly Report" teaser tile on the dashboard has hardcoded fake numbers, not connected to real check-in/ritual data.
- Leftover unrelated "travel app" template code still lives in `App.tsx` (destinations, themes, favorites, attractions) — this predates the Vocalii pivot and drives the background gradient theming plus the favorites modal. Harmless but confusing if you go looking for where a color theme comes from.
- `WeatherWidget.tsx` name is misleading — it's the voice-confidence gauge, not weather.
- No loading/error states on any dashboard card beyond the top-level `authLoading` spinner — if a Supabase query fails, the corresponding section just renders with empty/null data silently.
