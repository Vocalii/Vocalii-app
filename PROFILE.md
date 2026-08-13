# Profile Page

High-level overview only. `ProfilePage.tsx` is where every onboarding answer can be revisited,
plus account-level actions that don't fit anywhere else.

## Identity

Name + email, editable inline, plus an optional password change (same field, same save action —
leaving the password fields blank just updates the name).

## Your Details

Four circular fields, click-to-edit, each reusing the exact same picker UI as its onboarding
screen: **Role**, **Experience**, **Voice trait**, **Barrier**. Saving any one of these updates
`profiles` immediately — no separate "save all" step.

## Goals

Same picker as onboarding (`ScreenGoals.tsx`'s options), single-select. Changing it changes which
formula `goalProgress.ts` uses going forward — see `GOALS.md`.

## Account (added recently)

Sits at the bottom of the page, two rows:
- **Terms & Conditions** — reopens the same copy shown during signup, read-only.
- **Delete Account** — a confirm-modal (explicit "this can't be undone" warning) in front of
  actually deleting anything. On confirm, calls `/api/delete-account`, which verifies the caller's
  own access token server-side, then deletes the Supabase auth user — every user-owned table
  cascades from that single deletion via `ON DELETE CASCADE` foreign keys, so nothing needs a
  separate per-table delete call.

## What's *not* editable here

Habits are edited from the dashboard's "Your Habits" card instead (`HabitCard.tsx`), not from
this page, even though the data (`habitPairs`) flows through the same `onSave` callback.
