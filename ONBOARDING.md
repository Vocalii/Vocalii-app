# Onboarding — flow and what each step feeds into

High-level overview only — we'll expand specific parts later. Flow lives in
`src/components/onboarding/OnboardingFlow.tsx`, which just steps through screens in order and
accumulates answers into one `OnboardingData` object, persisted to Supabase's `profiles` table
(plus a couple related tables) once the whole flow completes.

## The steps, in order

1. **Auth** (`AuthScreen.tsx`) — sign up / sign in, or "Quick Preview" to bypass auth entirely
   (no persistence, just explores the app with local-only state).
2. **Terms** (`ScreenTerms.tsx`) — accept terms & privacy copy. No data collected.
3. **Role** (`ScreenRole.tsx`) — how they use their voice (Educator, Trainer, Speaker, Executive,
   Creator, Singer, Voice Therapy/Rehab, Other). Currently just profile context — doesn't yet
   drive ritual selection or scoring.
4. **Experience** (`ScreenExperience.tsx`) — Beginner / Some experience / Trained. Feeds ritual
   *difficulty* preference only (soft preference, not a hard filter) — no longer affects how many
   rituals they get per day.
5. **Voice Traits** (`ScreenVoiceTraits.tsx`) — pick 1 of 5 traits (Confident, Calm, Clear, Warm,
   Engaging) they want their voice to embody, plus an optional personal statement. Drives the
   dashboard hero copy/glow, the weekly report's trait-alignment visualization, and which 2
   questions show up in the weekly check-in. Content for all 5 traits (colors, copy, questions) is
   editable in Sanity — see `SANITY.md`.
6. **Goals** (`ScreenGoals.tsx`) — pick 1 of 5 goals (Reduce strain, Build endurance, Improve
   clarity, Own my voice, Build routine). This is the big one — it selects which formula
   `goalProgress.ts` uses to compute their weekly status (IMPROVING / HOLDING_STEADY /
   NEEDS_SUPPORT / GOAL_ACHIEVED / MORE_DATA_NEEDED) shown on the dashboard's goal card.
7. **Voice Barriers** (`ScreenVoiceBarriers.tsx`) — what makes it hard to practice: Time &
   Consistency, Confidence & Identity, Physical Demands, or None of these. Each of the first three
   has a real, modest effect on daily ritual selection (e.g. Time & Consistency trims the daily
   count down; Physical Demands nudges toward gentler difficulty and lower load thresholds).
8. **Habits** (`ScreenHabits.tsx`) — pair at least 3 daily habits (existing routine, e.g. "Morning
   coffee") with vocal habits (e.g. "2-min vocal hum") to attach a new habit onto one already in
   place. Both pools are editable in Sanity. Shown back on the dashboard's "Your Habits" card and
   factored into the `build_routine` goal's completion percentage.
9. **Baseline** (`ScreenBaseline.tsx`, wraps `BaselineFlow.tsx`) — 3 short recordings (Sustained
   Vowel, Read Aloud, Free Speech) analyzed client-side via the Web Audio API to establish a
   starting pitch/resonance/clarity/stability score. Skippable. This baseline score is later used
   as the comparison point for the `improve_clarity` goal's target (`baseline + 10%`).

After step 9, `onComplete` fires → `App.tsx`'s `handleOnboardingComplete` upserts everything into
`profiles`, plus `habit_pairs` and (if baseline wasn't skipped) the baseline metric columns.

## Where things go after onboarding

- **Role/Experience/Traits/Goals/Barrier** are all editable again later from `ProfilePage.tsx`
  (same picker UI, one field at a time).
- **Daily ritual selection** (`src/lib/ritualSelection.ts`) reads Experience (difficulty),
  Goals (indirectly, via which barrier/goal combo is active), and Voice Barrier (count + difficulty
  adjustments) every time a daily check-in is submitted — see the "Ritual Selection — How It
  Works" reference doc for the full breakdown of that logic.
- **Weekly goal status** (`src/lib/goalProgress.ts`) reads Goals to pick the scoring formula — see
  the "Goal Progress — How It's Calculated" reference doc.
- **Safety escalation** (same file as ritual selection) runs independently of any onboarding
  choice — it's a pure free-text scan on daily check-in notes, not affected by profile answers.
