export interface HabitOption {
  id: string;
  label: string;
  emoji: string;
}

// Static safety net — used until (or unless) loadHabitsFromSanity() successfully populates the
// arrays below. Sanity ("Habit" content type, project j8ce9qq6 / dataset vocalii) is now the
// source of truth for this content; these arrays only guard against Sanity being unreachable,
// slow, or briefly empty.
const FALLBACK_DAILY_HABITS: HabitOption[] = [
  { id: 'morning_coffee', label: 'Morning coffee', emoji: '☕' },
  { id: 'brush_teeth', label: 'Brushing teeth', emoji: '🪥' },
  { id: 'morning_shower', label: 'Morning shower', emoji: '🚿' },
  { id: 'lunch_break', label: 'Lunch break', emoji: '🍽️' },
  { id: 'evening_walk', label: 'Evening walk', emoji: '🚶' },
  { id: 'bedtime_routine', label: 'Bedtime routine', emoji: '🌙' },
];

const FALLBACK_VOCAL_HABITS: HabitOption[] = [
  { id: 'drink_water', label: 'Drink a glass of water', emoji: '💧' },
  { id: 'vocal_hum', label: '2-min vocal hum', emoji: '🎵' },
  { id: 'lip_trill', label: 'Lip trill exercise', emoji: '💋' },
  { id: 'deep_breath', label: 'Deep breathing', emoji: '🌬️' },
  { id: 'jaw_stretch', label: 'Neck & jaw stretch', emoji: '🧘' },
  { id: 'silent_rest', label: 'Silent rest (2 min)', emoji: '🤫' },
];

// Mutable — populated from the FALLBACK_* arrays at module load, then swapped in place by
// loadHabitsFromSanity() below. Every existing call site holds a reference to these same arrays,
// so mutating their contents (rather than reassigning the export) means none of them need to
// change to pick up live data.
export const DAILY_HABITS: HabitOption[] = [...FALLBACK_DAILY_HABITS];
export const VOCAL_HABITS: HabitOption[] = [...FALLBACK_VOCAL_HABITS];

const SANITY_PROJECT_ID = 'j8ce9qq6';
const SANITY_DATASET = 'vocalii';
const SANITY_API_VERSION = '2024-01-01';

interface SanityHabitDoc {
  habitId: string;
  kind: 'daily' | 'vocal';
  label: string;
  emoji: string;
  sortOrder: number;
}

// Plain fetch against Sanity's public read-only CDN query API — the "vocalii" dataset is public,
// so this needs no API token.
const HABITS_QUERY = encodeURIComponent(
  '*[_type == "habit"] | order(sortOrder asc) { habitId, kind, label, emoji, sortOrder }'
);

// Fetches the live habit library from Sanity and swaps DAILY_HABITS/VOCAL_HABITS' contents in
// place. Never leaves either array empty: on any failure, timeout, or empty result, it silently
// keeps whatever was already loaded (the FALLBACK_* seed on first boot).
export async function loadHabitsFromSanity(timeoutMs = 4000): Promise<void> {
  const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${HABITS_QUERY}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
    const { result } = (await res.json()) as { result: SanityHabitDoc[] };
    if (!Array.isArray(result) || result.length === 0) return;

    const mapOption = (doc: SanityHabitDoc): HabitOption => ({ id: doc.habitId, label: doc.label, emoji: doc.emoji });
    const daily = result.filter(d => d.kind === 'daily').map(mapOption);
    const vocal = result.filter(d => d.kind === 'vocal').map(mapOption);
    if (daily.length === 0 || vocal.length === 0) return; // keep whatever's currently loaded

    DAILY_HABITS.length = 0;
    DAILY_HABITS.push(...daily);
    VOCAL_HABITS.length = 0;
    VOCAL_HABITS.push(...vocal);
  } catch (err) {
    console.error('[habits] Failed to load from Sanity, using fallback/cached data:', err);
  }
}
