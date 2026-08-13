# Notifications

High-level overview only. Client-side, in-memory only — not a `notifications` DB table, not
push/email. They exist for the current session via the bell icon in `Header.tsx`.

## What triggers one

| Trigger | Where |
|---|---|
| Daily check-in submitted | Copy varies — high effort/symptoms, low effort, or neutral (`postCheckInTrigger`, `notificationTriggers.ts`) |
| Safety escalation | "Take it easy today" + the AI-generated (or fallback) explanation — see the safety artifact |
| Voice analysis report saved | Simple confirmation |
| New baseline set | Simple confirmation |
| Event created | Names the event |
| Prep mode starts | Once per event (`vocalii_prep_notified_event_id` in localStorage prevents repeats on refresh) |

All go through one `addNotification(text, detail?)` helper in `App.tsx`.

## The dropdown (`Header.tsx`)

Dark glass card off the bell icon. Each row is independently dismissible (click the row or its X)
via `onDismissNotification(id)` — plus a "Clear all." Nothing persists across a real reload;
they're just React state for the session.
