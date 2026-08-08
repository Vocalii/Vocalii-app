// Shared phrase libraries for the "Read Aloud" and "Free Speech" recording steps — used by both
// the onboarding baseline recorder (BaselineFlow.tsx) and the voice analyzer (VoiceAnalyzerPage.tsx)
// so a fresh phrase gets picked each time someone records, instead of always reading the same line.
// Centralized here (rather than duplicated per this codebase's usual small-constant convention)
// since both call sites need to stay in sync on the same pool and pick logic as this grows.

export const READ_ALOUD_PHRASES: string[] = [
  '"The early morning fog settled gently over the rolling hills, and the birds began to sing."',
  '"A gentle breeze drifted through the open window, carrying the scent of fresh rain and blooming flowers."',
  '"She walked along the quiet shoreline, watching the waves crash softly against the smooth grey stones."',
  '"The old wooden bridge creaked beneath their footsteps as they crossed over the slow-moving river."',
  '"Golden sunlight poured through the tall pine trees, warming the forest floor after a long, cold winter."',
  '"He poured a cup of coffee and settled into his favorite chair to read the morning newspaper."',
];

export const FREE_SPEECH_PROMPTS: string[] = [
  'Tell us how you use your voice in your daily life.',
  'Describe a typical day in your work or routine.',
  "What's something you're looking forward to this week?",
  'Talk about a hobby or activity you genuinely enjoy.',
  'Explain how you like to unwind at the end of the day.',
  'Share a bit about what your ideal weekend looks like.',
];

// `exclude` skips re-picking the currently-shown phrase (used by the "swap phrase" button) so
// clicking it always visibly changes the text, rather than sometimes landing on the same one.
export function pickRandomPhrase(list: string[], exclude?: string): string {
  const pool = exclude != null && list.length > 1 ? list.filter(p => p !== exclude) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}
