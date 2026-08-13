# Events & Performance (Prep) Mode

High-level overview only. Events are optional — the AI-tailored "prep mode" they can trigger is
the part worth understanding, since it overrides the normal daily ritual selection entirely.

## Creating an event (`EventCreationFlow.tsx`)

1. **Basics** — title, date, optional location, and a prep-window slider (1–7 days before the
   event). The slider caps itself so it can't overlap another event's existing prep window — only
   one prep window can be active at a time.
2. **AI conversation** — a chat with Claude (`/api/event-chat`) that asks a few short questions
   about the event (how vocally demanding it is, nervousness/confidence, format), then sends a
   one-line summary starting with a `[CONFIRM_REQUIRED]` marker and waits for the user to say
   "yes"/"confirm."
3. **Commit** — only after that explicit confirmation does Claude call a tool
   (`commit_ritual_plan`) returning an ordered list of ritual ids + a short insight, which becomes
   the event's `tailoredRitualIds`. No `ANTHROPIC_API_KEY`? A scripted mock conversation stands in
   so the flow still works end-to-end locally.

Stored in the `events` table with `prep_days_before` and `tailored_ritual_ids`.

## Performance (prep) mode

An event is "active" (`App.tsx`'s `activePrepEvent`) when today falls within
`[event.date − prepDaysBefore, event.date]`, inclusive of the event day itself. While active:

- **Daily ritual selection is fully bypassed** — `selectRituals()` returns the event's
  `tailoredRitualIds` directly, skipping the Claude call, the safety scan, everything. This is
  intentional: performance mode always wins outright.
- The dashboard's daily status card and ritual banners switch to prep-mode styling, and a
  one-time notification fires the first time prep mode starts for that event
  (`vocalii_prep_notified_event_id` in localStorage prevents repeats).
- `activePrepEventSummary` shows the event title and days-left countdown.

Only one event can be prep-active at a time (enforced at creation via the conflict check above).

## A recent fix worth knowing

The active-window check used to parse `event.date` (a plain `YYYY-MM-DD` string) with bare
`new Date(...)`, which reads as UTC midnight — compared against local "now," this silently ended
prep mode hours before the event day actually started in any negative-UTC-offset timezone (all of
the US). Fixed to parse/compare at local midnight instead, matching the date-handling convention
used everywhere else in the app.
