// Editorial "voice & tone" instruction injected into every AI-generated message (ritual-prep
// chat, weekly insight, voice-report insight, escalation/safety message) in server.ts. Sanity
// ("AI Voice & Tone" content type, project j8ce9qq6 / dataset vocalii) is the source of truth,
// fetched here on boot and refreshed on an interval so edits in Sanity take effect without a
// redeploy. FALLBACK_TONE is only used until (or unless) that first fetch succeeds.

const FALLBACK_TONE =
  'Warm, encouraging, and grounded — speak directly to the user ("you"/"your"). Keep language ' +
  'concise and non-clinical, never diagnostic. Stay positive but honest, grounded in the real ' +
  'data provided rather than generic filler.';

// Mutable wrapper (rather than a plain exported string) so refreshToneFromSanity() can update the
// value in place — every call site reads getAiTone() fresh rather than holding a stale copy.
const state = { tone: FALLBACK_TONE };

export function getAiTone(): string {
  return state.tone;
}

const SANITY_PROJECT_ID = 'j8ce9qq6';
const SANITY_DATASET = 'vocalii';
const SANITY_API_VERSION = '2024-01-01';
const AI_TONE_QUERY = encodeURIComponent('*[_type == "aiTone"][0].tone');

interface SanityAiToneResult {
  result: string | null;
}

// Fetches the live tone text from Sanity and swaps it in. Never clears the current value on
// failure, timeout, or an empty document — silently keeps whatever was already loaded.
async function refreshToneFromSanity(timeoutMs = 4000): Promise<void> {
  const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${AI_TONE_QUERY}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
    const { result } = (await res.json()) as SanityAiToneResult;
    if (typeof result === 'string' && result.trim().length > 0) {
      state.tone = result.trim();
    }
  } catch (err) {
    console.error('[aiTone] Failed to load from Sanity, using fallback/cached tone:', err);
  }
}

// Starts the periodic refresh loop: fetches immediately, then re-fetches every intervalMs so
// tone edits made in Sanity Studio take effect without restarting the server.
export function startAiToneRefreshLoop(intervalMs = 5 * 60 * 1000): void {
  void refreshToneFromSanity();
  setInterval(() => void refreshToneFromSanity(), intervalMs);
}
