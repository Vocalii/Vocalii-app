export interface TraitInfo {
  label: string;
  subtitle: string;
  emoji: string;
}

export interface TraitColor {
  primary: string;
  glow: string;
  border: string;
}

// Static safety net — used until (or unless) loadTraitsFromSanity() successfully populates the
// exports below. Sanity ("Voice Trait" content type, project j8ce9qq6 / dataset vocalii) is now
// the source of truth for this content; these only guard against Sanity being unreachable, slow,
// or briefly empty.
const FALLBACK_TRAITS: TraitInfo[] = [
  { label: 'Confident', subtitle: 'Impactful, powerful, authoritative', emoji: '💪' },
  { label: 'Calm', subtitle: 'Calm, grounded, relaxed', emoji: '🧘' },
  { label: 'Clear', subtitle: 'Clear, professional', emoji: '🎯' },
  { label: 'Warm', subtitle: 'Warm, approachable, authentic', emoji: '☀️' },
  { label: 'Engaging', subtitle: 'Energetic, dynamic', emoji: '⚡' },
];

const FALLBACK_TRAIT_COLORS: Record<string, TraitColor> = {
  Confident: { primary: '#f59e0b', glow: 'rgba(245,158,11,0.22)', border: 'rgba(245,158,11,0.6)' },
  Calm: { primary: '#818cf8', glow: 'rgba(129,140,248,0.22)', border: 'rgba(129,140,248,0.6)' },
  Clear: { primary: '#21e8ff', glow: 'rgba(33,232,255,0.22)', border: 'rgba(33,232,255,0.6)' },
  Warm: { primary: '#f97316', glow: 'rgba(249,115,22,0.22)', border: 'rgba(249,115,22,0.6)' },
  Engaging: { primary: '#10b981', glow: 'rgba(16,185,129,0.22)', border: 'rgba(16,185,129,0.6)' },
};

// {{word}} marks the main trait word (full color + strongest glow in HeroSection);
// **word** marks secondary words (same color, dialed down, less glow)
const FALLBACK_TRAIT_DESCRIPTIONS: Record<string, string> = {
  Confident: 'You want a {{Confident}} voice that focuses on sounding **impactful**, **powerful**, and **authoritative**.',
  Calm: 'You want a {{Calm}} voice that focuses on feeling **grounded** and **relaxed**.',
  Clear: 'You want a {{Clear}} voice that focuses on sounding **professional** and **easy to follow**.',
  Warm: 'You want a {{Warm}} voice that focuses on feeling **approachable** and **authentic**.',
  Engaging: 'You want an {{Engaging}} voice that focuses on being **energetic** and **dynamic** when you speak.',
};

// Short mantra shown as the dashboard quote and as the "e.g. ..." input placeholder.
const FALLBACK_TRAIT_QUOTES: Record<string, string> = {
  Confident: 'I want to trust my voice.',
  Calm: 'I want to stay grounded while I speak.',
  Clear: 'I want my message to come through effortlessly.',
  Warm: 'I want people to feel welcomed by my tone.',
  Engaging: 'I want my energy to be contagious.',
};

const FALLBACK_TRAIT_QUESTIONS: Record<string, [string, string]> = {
  Confident: [
    'How confident and powerful did your voice feel when you needed to make an impact this week?',
    'How often did your voice feel like it supported your authority in conversations or presentations?',
  ],
  Calm: [
    'How grounded and relaxed did your voice feel during stressful or high-pressure moments this week?',
    'How often were you able to speak with ease rather than tension or urgency?',
  ],
  Clear: [
    'How clear and professional did your voice sound in your most important communication this week?',
    'How often did your voice feel precise and easy to follow when you were speaking?',
  ],
  Warm: [
    'How warm and approachable did your voice feel in conversations this week?',
    'How often did your voice feel genuinely like you — natural and unforced?',
  ],
  Engaging: [
    'How energetic and dynamic did your voice feel during conversations or presentations this week?',
    'How well did your voice hold attention and keep people engaged this week?',
  ],
};

// Mutable — populated from the FALLBACK_* data at module load, then swapped in place by
// loadTraitsFromSanity() below. Every existing call site holds a reference to these same
// arrays/objects, so mutating their contents (rather than reassigning the export) means none of
// them need to change to pick up live data.
export const TRAITS: TraitInfo[] = [...FALLBACK_TRAITS];
export const TRAIT_COLORS: Record<string, TraitColor> = { ...FALLBACK_TRAIT_COLORS };
export const TRAIT_DESCRIPTIONS: Record<string, string> = { ...FALLBACK_TRAIT_DESCRIPTIONS };
export const TRAIT_QUOTES: Record<string, string> = { ...FALLBACK_TRAIT_QUOTES };
export const TRAIT_QUESTIONS: Record<string, [string, string]> = { ...FALLBACK_TRAIT_QUESTIONS };

function replaceRecordInPlace<T>(target: Record<string, T>, next: Record<string, T>): void {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, next);
}

const SANITY_PROJECT_ID = 'j8ce9qq6';
const SANITY_DATASET = 'vocalii';
const SANITY_API_VERSION = '2024-01-01';

interface SanityTraitDoc {
  label: string;
  subtitle: string;
  emoji: string;
  colorPrimary: string;
  colorGlow: string;
  colorBorder: string;
  description: string;
  quote: string;
  weeklyQuestion1: string;
  weeklyQuestion2: string;
  sortOrder: number;
}

// Plain fetch against Sanity's public read-only CDN query API — the "vocalii" dataset is public,
// so this needs no API token.
const TRAITS_QUERY = encodeURIComponent(
  '*[_type == "trait"] | order(sortOrder asc) { label, subtitle, emoji, colorPrimary, colorGlow, colorBorder, description, quote, weeklyQuestion1, weeklyQuestion2, sortOrder }'
);

// Fetches the live trait library from Sanity and swaps TRAITS/TRAIT_COLORS/TRAIT_DESCRIPTIONS/
// TRAIT_QUOTES/TRAIT_QUESTIONS' contents in place. Never leaves them empty: on any failure,
// timeout, or empty result, it silently keeps whatever was already loaded (the FALLBACK_* seed
// on first boot).
export async function loadTraitsFromSanity(timeoutMs = 4000): Promise<void> {
  const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${TRAITS_QUERY}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
    const { result } = (await res.json()) as { result: SanityTraitDoc[] };
    if (!Array.isArray(result) || result.length === 0) return;

    const traits: TraitInfo[] = [];
    const colors: Record<string, TraitColor> = {};
    const descriptions: Record<string, string> = {};
    const quotes: Record<string, string> = {};
    const questions: Record<string, [string, string]> = {};
    for (const doc of result) {
      traits.push({ label: doc.label, subtitle: doc.subtitle, emoji: doc.emoji });
      colors[doc.label] = { primary: doc.colorPrimary, glow: doc.colorGlow, border: doc.colorBorder };
      descriptions[doc.label] = doc.description;
      quotes[doc.label] = doc.quote;
      questions[doc.label] = [doc.weeklyQuestion1, doc.weeklyQuestion2];
    }

    TRAITS.length = 0;
    TRAITS.push(...traits);
    replaceRecordInPlace(TRAIT_COLORS, colors);
    replaceRecordInPlace(TRAIT_DESCRIPTIONS, descriptions);
    replaceRecordInPlace(TRAIT_QUOTES, quotes);
    replaceRecordInPlace(TRAIT_QUESTIONS, questions);
  } catch (err) {
    console.error('[traits] Failed to load from Sanity, using fallback/cached data:', err);
  }
}
