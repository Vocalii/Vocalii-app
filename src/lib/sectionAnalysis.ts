// Transparent, literally-true per-section measurement for the Voice Analyzer — replaces the old
// unvalidated FFT-based pitch/resonance/clarity/stability/fatigue scoring (still used by
// BaselineFlow.tsx via voiceAnalysis.ts, untouched by this module). Everything here is either a
// plain count/ratio (words per minute, word-level similarity) or a simple pass/fail volume check —
// nothing claims to measure acoustic properties of the voice itself.
import { SILENCE_RMS_THRESHOLD } from './voiceAnalysis';

// Lowercase, strip everything but letters/digits/apostrophes (so "didn't" survives intact, but
// trailing punctuation from the prompt banks doesn't inflate the word count), split on whitespace.
export function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function calculateWpm(wordCount: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return Math.round(wordCount / (durationSeconds / 60));
}

// Used to combine multiple attempts at the same prompt (see "Try Another Prompt" in
// VoiceAnalyzerPage.tsx) into one representative number per section.
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

// Word-level Levenshtein edit distance (insert/delete/substitute, each cost 1) between the
// transcript and the expected text, normalized into a 0-100 percentage. Deliberately basic — word
// identity and order matter, synonyms/paraphrasing don't count as a match. Normalized against the
// expected text's word count (not the transcript's) so a rambling transcript is penalized rather
// than hiding behind a long denominator.
export function wordLevelSimilarity(transcript: string, expected: string): number {
  const a = tokenizeWords(transcript);
  const b = tokenizeWords(expected);
  if (b.length === 0) return 0;

  // Standard DP edit-distance table over word arrays.
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  const editDistance = dp[a.length][b.length];
  const ratio = 1 - editDistance / b.length;
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

export interface SustainedVowelResult {
  pass: boolean;
  reasonIfFailed: string | null;
}

// No transcription — just "was there a usable, sustained sound here." Reuses the same per-frame
// RMS samples already collected during recording (via measureFrameRms in voiceAnalysis.ts) rather
// than re-deriving anything acoustic.
export function evaluateSustainedVowel(rmsSamples: number[], recordedDurationSeconds: number): SustainedVowelResult {
  if (recordedDurationSeconds < 1.5) {
    return { pass: false, reasonIfFailed: "That was a bit short — try holding the note for closer to 3 seconds." };
  }
  const aboveThreshold = rmsSamples.filter(rms => rms > SILENCE_RMS_THRESHOLD).length;
  if (rmsSamples.length === 0 || aboveThreshold / rmsSamples.length < 0.5) {
    return { pass: false, reasonIfFailed: "We didn't hear enough sound — try holding the note closer to the mic." };
  }
  return { pass: true, reasonIfFailed: null };
}

// Integration point for a future validated acoustic-analysis service. Intentionally returns null
// today — do not compute anything acoustic here. Takes the raw recorded audio so a future
// implementation can fill this in without any call site needing to change.
export async function analyzeAcoustics(recordings: { label: string; blob: Blob }[]): Promise<null> {
  void recordings;
  return null;
}
