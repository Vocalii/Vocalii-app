// Shared phrase libraries for the "Read Aloud" and "Free Speech" recording steps — used by both
// the onboarding baseline recorder (BaselineFlow.tsx) and the voice analyzer (VoiceAnalyzerPage.tsx)
// so a fresh phrase gets picked each time someone records, instead of always reading the same line.
// Centralized here (rather than duplicated per this codebase's usual small-constant convention)
// since both call sites need to stay in sync on the same pool and pick logic as this grows.
//
// Sanity ("Recording Prompt" content type, project j8ce9qq6 / dataset vocalii) is now the source
// of truth for this content; the arrays below are only a static safety net used until (or unless)
// loadRecordingPromptsFromSanity() successfully populates them.

const FALLBACK_READ_ALOUD_PHRASES: string[] = [
  '"The early morning fog settled gently over the rolling hills, and the birds began to sing."',
  '"A gentle breeze drifted through the open window, carrying the scent of fresh rain and blooming flowers."',
  '"She walked along the quiet shoreline, watching the waves crash softly against the smooth grey stones."',
  '"The old wooden bridge creaked beneath their footsteps as they crossed over the slow-moving river."',
  '"Golden sunlight poured through the tall pine trees, warming the forest floor after a long, cold winter."',
  '"He poured a cup of coffee and settled into his favorite chair to read the morning newspaper."',
];

const FALLBACK_FREE_SPEECH_PROMPTS: string[] = [
  'Tell us how you use your voice in your daily life.',
  'Describe a typical day in your work or routine.',
  "What's something you're looking forward to this week?",
  'Talk about a hobby or activity you genuinely enjoy.',
  'Explain how you like to unwind at the end of the day.',
  'Share a bit about what your ideal weekend looks like.',
];

// Mutable — populated from the FALLBACK_* arrays at module load, then swapped in place by
// loadRecordingPromptsFromSanity() below. Every existing call site holds a reference to these
// same arrays, so mutating their contents (rather than reassigning the export) means none of
// them need to change to pick up live data.
export const READ_ALOUD_PHRASES: string[] = [...FALLBACK_READ_ALOUD_PHRASES];
export const FREE_SPEECH_PROMPTS: string[] = [...FALLBACK_FREE_SPEECH_PROMPTS];

// `exclude` skips re-picking the currently-shown phrase (used by the "swap phrase" button) so
// clicking it always visibly changes the text, rather than sometimes landing on the same one.
export function pickRandomPhrase(list: string[], exclude?: string): string {
  const pool = exclude != null && list.length > 1 ? list.filter(p => p !== exclude) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

const SANITY_PROJECT_ID = 'j8ce9qq6';
const SANITY_DATASET = 'vocalii';
const SANITY_API_VERSION = '2024-01-01';

interface SanityRecordingPromptDoc {
  kind: 'read_aloud' | 'free_speech';
  text: string;
}

// Plain fetch against Sanity's public read-only CDN query API — the "vocalii" dataset is public,
// so this needs no API token.
const RECORDING_PROMPTS_QUERY = encodeURIComponent(
  '*[_type == "recordingPrompt"] | order(sortOrder asc) { kind, text }'
);

// Fetches the live phrase libraries from Sanity and swaps READ_ALOUD_PHRASES/FREE_SPEECH_PROMPTS'
// contents in place. Never leaves either array empty: on any failure, timeout, or empty result,
// it silently keeps whatever was already loaded (the FALLBACK_* seed on first boot).
export async function loadRecordingPromptsFromSanity(timeoutMs = 4000): Promise<void> {
  const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${RECORDING_PROMPTS_QUERY}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
    const { result } = (await res.json()) as { result: SanityRecordingPromptDoc[] };
    if (!Array.isArray(result) || result.length === 0) return;

    const readAloud = result.filter(d => d.kind === 'read_aloud').map(d => d.text);
    const freeSpeech = result.filter(d => d.kind === 'free_speech').map(d => d.text);
    if (readAloud.length === 0 || freeSpeech.length === 0) return; // keep whatever's currently loaded

    READ_ALOUD_PHRASES.length = 0;
    READ_ALOUD_PHRASES.push(...readAloud);
    FREE_SPEECH_PROMPTS.length = 0;
    FREE_SPEECH_PROMPTS.push(...freeSpeech);
  } catch (err) {
    console.error('[recordingPrompts] Failed to load from Sanity, using fallback/cached data:', err);
  }
}
