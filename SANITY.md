# Sanity CMS — what's editable and how

Vocalii uses [Sanity](https://sanity.io) as a headless CMS for a handful of content types that
used to be hardcoded in the app. This doc covers what's in there, how to edit it, and how edits
reach the live app.

## Project details

- **Project ID**: `j8ce9qq6`
- **Dataset**: `vocalii` (public — read-only queries need no API token)
- **Hosted Studio**: https://vocalii-rituals.sanity.studio/
- **Owning account**: `shuvocalii@gmail.com` is the Administrator on this project. If you need
  access under a different email, sign into `sanity.io/manage` as `shuvocalii@gmail.com` and
  invite the other account from the project's team settings.
- **Schema source**: `studio/schemaTypes/` in this repo (one file per content type, registered in
  `studio/schemaTypes/index.ts`).

## How to edit content

1. Go to https://vocalii-rituals.sanity.studio/ and log in.
2. Pick a content type from the left sidebar (Ritual, Habit, Voice Trait, or Recording Prompt).
3. Click a document to edit its fields, or **+** to create a new one.
4. Hit **Publish** (top right) — draft edits alone don't count, only published documents are
   served to the app.

No redeploy needed for content edits — see "How edits reach the app" below. A **schema change**
(adding/removing a field, changing a content type's shape) is a code change in
`studio/schemaTypes/`, and does need `cd studio && npx sanity deploy -y` to push the new schema to
the Studio UI.

## Content types

### Ritual
The exercises in the ritual library (Ground/Breathe/Warm Up/Release/Resonate/Build categories).

| Field | Type | Notes |
|---|---|---|
| `ritualId` | string | Stable id used in `daily_checkins.selected_ritual_ids`, `ritual_completions.ritual_id`. **Never change after rituals have been assigned to users.** |
| `name` | string | |
| `category` | string (list) | Ground / Breathe / Warm Up / Release / Resonate / Build |
| `duration` | string | e.g. `"3 mins"` |
| `difficulty` | string (list) | Beginner / Intermediate / Advanced |
| `description` | text | |
| `instructionSteps` | string[] | The numbered steps shown in the player |
| `primaryFocus` | string | Short tag shown on the overview card |
| `benefits` | string[] | Shown in the "Why it works" modal |
| `overviewMedia` | object (optional) | Image or video shown in the ritual hero when browsing the library. Falls back to an animated icon when empty. |
| `playerMedia` | object (optional) | Image or video shown in place of the animated visual while actively doing the ritual. Falls back to a category animation when empty. |

`overviewMedia`/`playerMedia` are a shared `ritualMedia` object type: a `mediaType` toggle
(`image`/`video`) plus an `image` field or a `video` file field (whichever matches the toggle).

### Habit
The two pools in the habit-pairing picker (dashboard "Your Habits" card, profile page,
onboarding).

| Field | Type | Notes |
|---|---|---|
| `habitId` | string | Stable id used in `habit_pairs.daily_habit`/`.vocal_habit`, `habit_completions`. **Never change after habits have been paired by users.** |
| `kind` | string (list) | `daily` (existing routine, left column) or `vocal` (paired onto it, right column) |
| `label` | string | |
| `emoji` | string | |
| `sortOrder` | number | Lower = earlier in its column |

### Voice Trait
The 5 traits (Confident, Calm, Clear, Warm, Engaging) picked during onboarding and shown on the
dashboard hero / weekly report.

| Field | Type | Notes |
|---|---|---|
| `label` | string | Stable id used in `profiles.desired_voice_traits`, `weekly_checkins`. **Never change after users have selected it.** |
| `subtitle` | string | Short descriptor on the onboarding picker card |
| `emoji` | string | |
| `colorPrimary` | string (hex) | e.g. `#f59e0b` — name color, glow border tint, emoji drop-shadow |
| `colorGlow` | string (rgba, low alpha) | e.g. `rgba(245,158,11,0.22)` — background glows |
| `colorBorder` | string (rgba, higher alpha) | e.g. `rgba(245,158,11,0.6)` — selected-state borders |
| `description` | text | Dashboard hero copy. Markup: `{{word}}` = strongest emphasis, `**word**` = secondary emphasis |
| `quote` | string | First-person mantra — used as the dashboard quote AND the input placeholder text |
| `weeklyQuestion1` / `weeklyQuestion2` | string | The two sliders asked in the weekly check-in for this trait |
| `sortOrder` | number | Order in the onboarding trait picker |

### Recording Prompt
The phrase pool for the "Read Aloud" and "Free Speech" steps in both the onboarding baseline
recorder and the voice analyzer. One phrase per step is picked at random on each recording
attempt (and can be re-rolled mid-recording via the shuffle button) — the 3rd step, "Sustained
Vowel," is fixed and has no pool.

| Field | Type | Notes |
|---|---|---|
| `kind` | string (list) | `read_aloud` or `free_speech` |
| `text` | text | For Read Aloud, include the surrounding quote marks exactly as they should display |
| `sortOrder` | number | Editorial ordering only — the app picks randomly, not in this order |

Add more entries any time to grow the variety pool — no code changes needed.

## How edits reach the app

Each content type has a live-fetch loader in the app (`src/ritualsData.ts`, `src/habitsData.ts`,
`src/traitsData.ts`, `src/lib/recordingPrompts.ts`). All four:

- Fetch from Sanity's public CDN query API (plain `fetch`, no SDK dependency, no token).
- Run once at app boot (`src/main.tsx`, before first render) and once at server boot
  (`server.ts`, for the rituals used in AI prompts).
- Mutate the exported arrays **in place** rather than reassigning them, so every place in the app
  that already imports e.g. `EXERCISE_RITUALS` picks up live data with no other code changes.
- Fall back to a small hardcoded seed array on any failure/timeout/empty result — the app never
  ends up with empty content even if Sanity is unreachable.

Practical effect: publish a change in Sanity, then reload the app tab (or wait for the next server
cold start) — no rebuild or redeploy required. It's **not** live-live; an already-open tab won't
see the edit until it reloads.

## Seed scripts

One-time migration scripts that originally populated Sanity from the app's old hardcoded content
live in `studio/`: `seedRituals.ts`, `seedHabits.ts`, `seedTraits.ts`, `seedRecordingPrompts.ts`.
Re-runnable safely (they `createOrReplace` on a deterministic `_id`), but you generally won't need
to run them again — they were one-time migrations, not something the ongoing edit workflow uses.

```
cd studio && npx sanity exec seedRituals.ts --with-user-token
```

## CORS

The Sanity project's CORS allowlist controls which origins the app is allowed to fetch content
from in the browser. Currently allowed: `http://localhost:3333` (Studio), `http://localhost:3000`
(app dev server), `https://vocalii-app.vercel.app` (production). Vercel **preview** deployments
(branches/PRs) get their own unique `*.vercel.app` subdomain each time and are **not** on this
list — if a preview URL shows a CORS error in the console, add it:

```
cd studio && npx sanity cors add https://<preview-url> --credentials
```
