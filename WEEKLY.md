# Weekly Check-In & Report — flow and what they show

High-level overview only. The check-in is one short form; the report is where everything from the
week gets pulled together and displayed.

## When it's due

`getReflectionWeekStart()` (`weeklyCheckin.ts`) pins the "current" week to last Monday, only
advancing on Sundays — so "due" just means "no `weekly_checkins` row exists yet for that
week_start." Brand-new accounts don't get prompted immediately: they need to be both 3+ days old
and past their first Sunday (`daysUntilWeeklyEligible()`), so the dashboard tile shows a neutral
"More Data Needed" state instead of asking someone to reflect on a week they weren't even using
the app for yet.

## The check-in itself (`WeeklyCheckInPage.tsx`)

A handful of 0–10 sliders:
- **2 goal questions**, specific to whichever goal is active (from `traitsData`/goal question
  sets) — reverse-scored for some goals where a lower answer is actually better.
- **2 trait questions**, specific to the user's chosen voice trait (content lives in Sanity —
  see `SANITY.md`).
- **1 universal confidence question** + an optional free-text reflection.

Submitting writes a `weekly_checkins` row and navigates straight into the Weekly Report — no
separate confirmation screen, since the report *is* the payoff for filling it out.

## The report (`WeeklyReportPage.tsx`)

Pulls real data for the Monday–Sunday week (not a rolling 7 days) and lays it out as:

- **AI Insight** — Overview / What improved / Needs attention, generated once per (user, week)
  via `/api/weekly-insight` and cached in `weekly_report_insights` so it's static on repeat
  views, not regenerated every time. Falls back to a template if the AI call fails.
- **Metric circles** — check-ins (`/7`), rituals done, avg vocal effort, avg confidence, avg
  resonance (if any voice-analyzer sessions happened that week).
- **Goal progress** — the same `GoalProgressCard` status ladder shown on the dashboard.
- **Trait alignment** — a glow visualization (`TraitAlignmentGlow.tsx`) scored from that week's 2
  trait questions, with a short "your voice felt {{aligned}} with your trait" statement.
- **Habits this week** — completion view of the daily↔vocal habit pairs.
- **Top rituals** — the rituals completed most that week.
- **Per-day breakdown** — each day's ritual-completion dots use *that day's* actual assigned
  ritual count as the denominator (not today's live count applied uniformly), so a day with 2
  rituals assigned shows `x/2`, not `x/(today's count)`.

## Dashboard teaser

`WeeklyReportSummary.tsx` is a smaller self-fetching version of the same week's stats, shown in
the dashboard tile once the check-in's done (see `DASHBOARD.md`) — clicking it opens the full
report above.
