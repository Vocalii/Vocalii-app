# Voice Analyzer & Reports

High-level overview only. Recording/scoring is covered in more depth by the fact that it now
shares logic with the onboarding baseline — see `ONBOARDING.md`'s step 9 for the recording
mechanics themselves.

## Recording a session (`VoiceAnalyzerPage.tsx`)

Same 3-step recording as the onboarding baseline (Sustained Vowel, Read Aloud, Free Speech) and
the exact same scoring math (`computeSegmentMetrics` + the same combine weights — stability
40/35/25, resonance/clarity/loudness/pitch averaged) — a report and the baseline score an
equivalent recording identically. "Read Aloud"/"Free Speech" each pull a random phrase from the
shared Sanity-backed pool (`SANITY.md`), swappable via a shuffle button even mid-recording.

Produces a `VocalMetrics` object: pitch, pitch range, resonance score, clarity %, loudness (dB),
stability %, and a fatigue estimate (Low/Moderate/High) derived from stability.

After recording, the flow asks two more things before saving:
- **How did it feel** — multi-select feelings (Hoarseness, Dryness, Tension, Breathiness,
  Fatigue, Pain).
- **Notes** — optional free text.

An AI insight (`/api/voice-report-insight`) interprets the metrics together (not just restating
each number) plus the self-reported feelings/notes, with a template fallback if the call fails.

## Saving & storage

Saved to `vocal_reports` — one row per session, all 6 metrics + fatigue level + feelings + notes +
the AI insight + an auto-generated name/timestamp. Comes back into the app as a `VocalReport` via
`mapReport()`.

## Viewing reports (`ReportsPage.tsx`)

A list of past sessions with:
- **Favourite** toggle (`is_favourite`) and a favourites-only filter.
- **Rename** (inline edit) and **delete** (with a confirm step).
- **PDF export** (via `jspdf`) of a single report's detail view.

## How this differs from a daily check-in

The daily check-in (`RitualsPage.tsx`) is quick sliders — effort, demand, confidence, symptoms —
submitted once a day and used to drive ritual selection (see `WEEKLY.md`/the ritual-selection
artifact). The voice analyzer is a deliberate, opt-in recording session that produces real
acoustic measurements, not just self-reported numbers, and isn't tied to daily ritual selection at
all — it only feeds the `improve_clarity` goal's weekly average (see `GOALS.md`) and its own
report history.
