# Dashboard — what's on it

High-level overview only — we'll expand specific parts later. Rendered from `App.tsx`'s home view
(`currentView === 'home'`) as a 2-column grid (8/4 split on desktop). `Header.tsx` (logo, nav,
notification bell, profile dropdown) is a persistent top bar across every view, not just this one.

## Left column (8/12)

1. **Hero** (`HeroSection.tsx`) — greeting, the user's chosen voice trait shown as trait-colored
   copy + glow (content sourced from Sanity, see `SANITY.md`), and a link into the weekly report.
2. **Performance Statistics** section:
   - **Daily status card** (`VoiceHealthStatus.tsx`, imported as `InteractiveMap` — a leftover
     alias from an earlier template, functionally unrelated to maps) — shows whether today's
     check-in is done, today's effort/demand reading, and a "Recommended Ritual" quick-link into
     the next incomplete ritual from `dailyRitualIds`. Styled differently when an event-prep
     window (`activePrepEvent`) is active.
   - **OMNI-Voice Confidence / OMNI-Vocal Effort** (`WeatherWidget.tsx`) — one arc-gauge card that
     autoplays between two faces every 6s: today's voice confidence (purple, /5) and today's vocal
     effort (orange, /10).
   - **Goal progress** (`GoalProgressCard.tsx`) — the status ladder result (IMPROVING /
     HOLDING_STEADY / NEEDS_SUPPORT / GOAL_ACHIEVED / MORE_DATA_NEEDED) for whichever goal was
     picked in onboarding — see the "Goal Progress" reference doc for the full scoring logic.
   - **Consistency chart** (`DashboardConsistencyChart.tsx`) — check-in/ritual-completion trend
     over time.

## Right column (4/12)

1. **Your Habits** (`HabitCard.tsx`) — the daily↔vocal habit pairs from onboarding (or edited
   since), with an edit modal reusing `HabitPairPicker.tsx`. Habit content itself (both pools) is
   editable in Sanity.
2. **Weekly check-in / report tile** — one card, three states:
   - **More Data Needed** (grey, inert) — shown for brand-new accounts until they're both 3+ days
     old and past their first Sunday.
   - **Due this week** (cyan, pulsing, clickable) — opens the weekly check-in flow.
   - **Report ready** (`WeeklyReportSummary.tsx`) — this week's check-in/ritual stats teaser,
     clicking opens the full weekly report.
3. **Upcoming Events** (`UpcomingEventsCard.tsx`) — add/edit/delete events with an optional
   "prep window" (days-before count that, while active, switches daily ritual selection over to
   an AI-tailored plan for that event instead of the normal daily selection — see the "Ritual
   Selection" reference doc).

## Persistent chrome (not part of the grid)

- **Header** (`Header.tsx`) — logo, nav links, notification bell (dismissible per-item), profile
  dropdown (Profile / Log out).
- **Notifications** — surfaced via the bell icon; triggered by things like check-in completion,
  entering/leaving prep mode, and safety escalations.
