# Goals — how they're set and scored

High-level overview only — full scoring formulas are in the linked "Goal Progress — How It's
Calculated" artifact. This doc is just the shape of the system: where a goal gets picked, how it's
scored, and where that shows up.

## Picking a goal

Users pick exactly **1 of 5 goals** during onboarding (`ScreenGoals.tsx`, step 6) — Reduce strain,
Build endurance, Improve clarity, Own my voice, or Build routine — and can change it later from
`ProfilePage.tsx`. Stored in `profiles.goals` (an array, though the app only ever uses the first
entry today).

## Scoring: the status ladder

Whichever goal is active, `goalProgress.ts` runs it through the same 6-rule ladder every week to
produce one of 5 statuses shown on the dashboard's `GoalProgressCard.tsx`:

`MORE_DATA_NEEDED` → `NEEDS_SUPPORT` → `HOLDING_STEADY` → `IMPROVING` → `GOAL_ACHIEVED`

In priority order: a safety trigger overrides everything into `NEEDS_SUPPORT`; then two
not-enough-data gates; then "hit target for 2 straight weeks" wins `GOAL_ACHIEVED`; then the
week-over-week change (against a per-goal threshold) decides `NEEDS_SUPPORT` / `IMPROVING` /
`HOLDING_STEADY`.

## Each goal's own metric

Every goal plugs a different primary signal into that same ladder:

| Goal | Primary signal | Target |
|---|---|---|
| Reduce strain | Vocal effort — ritual feedback is the *primary* input, daily check-in a minor secondary one | ≤3 |
| Build endurance | Same, but only on high-demand days, and ritual feedback is weighted extra (4×) on those days | ≤3 |
| Improve clarity | Voice-analyzer clarity % | baseline + 10% |
| Own my voice | Daily check-in confidence | ≥4/5 |
| Build routine | % of daily rituals + habits completed | ≥70% |

Two extra signals blend into all of these where relevant:
- **Weekly self-report** — the 2 questions asked in the weekly check-in for the active goal, worth
  about 2 daily check-ins' weight in that week's average.
- **Ritual completion feedback** — post-ritual feeling/difficulty ratings, the dominant signal for
  reduce_strain/build_endurance specifically.

## Where it shows up

- **Dashboard** — `GoalProgressCard.tsx` (status badge + primary value vs. target).
- **Weekly report** — the same status, plus an AI-generated "Overview / What improved / Needs
  attention" narrative built from the week's actual numbers (`/api/weekly-insight`).
- **Safety override** — independent of which goal is active: 2+ of the last 3 check-ins logging
  "Sore"/"Tight," or voice-loss language in a recent note, forces `NEEDS_SUPPORT` regardless of
  trend.
