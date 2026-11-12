// Transparent, literally-true per-section measurement for the Voice Analyzer — replaces the old
// unvalidated FFT-based pitch/resonance/clarity/stability/fatigue scoring (still used by
// BaselineFlow.tsx via voiceAnalysis.ts, untouched by this module). Everything here is either a
// plain count/ratio (words per minute, word-level similarity) or a simple pass/fail volume check —
// nothing claims to measure acoustic properties of the voice itself.
import { SILENCE_RMS_THRESHOLD } from './voiceAnalysis';
import type { AcousticStepResult, WordMatchDetail, WordMatchOp } from '../types/onboarding';

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

// Same character rules as tokenizeWords but keeps the original casing, so the word-by-word view can
// show the target text as written. Comparison is always done on the lowercased form.
function displayTokens(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Word-level alignment of the transcript against the expected text (Levenshtein: insert / delete /
// substitute, each cost 1). Returns the ordered per-word ops plus counts, so the report can show
// what was heard correctly, what was missed, swapped for another word, or added — not just one
// percentage. Deliberately basic: word identity and order matter, synonyms/paraphrasing don't count
// as a match. The percentage is normalized against the expected text's word count (not the
// transcript's) so a rambling transcript is penalized rather than hiding behind a long denominator.
// This compares against a transcript of what was heard; it is a target-word match, not a measure of
// pronunciation or intelligibility.
export function alignWords(transcript: string, expected: string): WordMatchDetail & { matchPct: number } {
  const heardRaw = displayTokens(transcript);
  const targetRaw = displayTokens(expected);
  const a = heardRaw.map(w => w.toLowerCase());
  const b = targetRaw.map(w => w.toLowerCase());

  // Standard DP edit-distance table over word arrays (rows = transcript, columns = expected).
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

  // Walk back from the end to recover the ops. On ties a substitution is preferred over a
  // delete + insert pair, matching how word error rate is normally counted.
  const ops: WordMatchOp[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      ops.push({ type: 'correct', target: targetRaw[j - 1], heard: heardRaw[i - 1] });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({ type: 'substituted', target: targetRaw[j - 1], heard: heardRaw[i - 1] });
      i--; j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push({ type: 'omitted', target: targetRaw[j - 1] });
      j--;
    } else {
      ops.push({ type: 'added', heard: heardRaw[i - 1] });
      i--;
    }
  }
  ops.reverse();

  const count = (type: WordMatchOp['type']) => ops.filter(o => o.type === type).length;
  const retry: string[] = [];
  const seen = new Set<string>();
  for (const op of ops) {
    if ((op.type === 'substituted' || op.type === 'omitted') && op.target) {
      const key = op.target.toLowerCase();
      if (!seen.has(key)) { seen.add(key); retry.push(op.target); }
    }
  }

  const matchPct = b.length === 0
    ? 0
    : Math.round(Math.max(0, Math.min(1, 1 - dp[a.length][b.length] / b.length)) * 100);

  return {
    ops,
    correct: count('correct'),
    substituted: count('substituted'),
    omitted: count('omitted'),
    added: count('added'),
    referenceWordCount: b.length,
    wordsToRetry: retry,
    matchPct,
  };
}

// Single-number target-word match (0-100). Kept as a thin wrapper so the percentage can never drift
// from the breakdown that alignWords() returns.
export function wordLevelSimilarity(transcript: string, expected: string): number {
  return alignWords(transcript, expected).matchPct;
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

const ACOUSTIC_TASK_TYPES = ['sustained_phonation', 'tongue_twister', 'sentence', 'free_speech'] as const;

// Sends each step's first recording to /api/voice-acoustics (a proxy to the voice-analysis-service).
// Resolves to null if nothing came back at all, so the report just omits the section.
export async function analyzeAcoustics(
  recordings: { label: string; blob: Blob; expectedText?: string }[]
): Promise<AcousticStepResult[] | null> {
  const results = await Promise.all(recordings.map(async (rec, i): Promise<AcousticStepResult | null> => {
    if (rec.blob.size === 0) return null;
    try {
      const qs = new URLSearchParams({
        taskType: ACOUSTIC_TASK_TYPES[i],
        expectedText: rec.expectedText ?? '',
        referenceProfile: 'personal',
      });
      const res = await fetch(`/api/voice-acoustics?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': rec.blob.type || 'application/octet-stream' },
        body: rec.blob,
      });
      if (!res.ok) return null;
      const { result } = await res.json();
      if (!result) return null;
      if (result.recording_quality?.passed === false) {
        return { label: rec.label, qualityMessage: result.recording_quality.user_message };
      }
      const m = result.acoustic_metrics;
      return {
        label: rec.label,
        medianF0Hz: m.median_f0_hz,
        pitchP10Hz: m.pitch_p10_hz,
        pitchP90Hz: m.pitch_p90_hz,
        pitchRangeSemitones: m.pitch_range_semitones,
        pitchVariabilitySdSemitones: m.pitch_variability_sd_semitones,
        meanHnrDb: m.mean_hnr_db,
        jitterLocalPercent: m.jitter_local_percent,
        shimmerLocalPercent: m.shimmer_local_percent,
        relativeLevelDbfs: m.relative_level_dbfs,
      };
    } catch {
      return null;
    }
  }));
  const present = results.filter((r): r is AcousticStepResult => r !== null);
  return present.length > 0 ? present : null;
}

export interface VoiceFunctionSummary {
  pitchHz: number | null;
  jitterPercent: number | null;
  shimmerPercent: number | null;
  hnrDb: number | null;
  volumeDbfs: number | null;
}

function averagePresent(values: (number | null | undefined)[]): number | null {
  const present = values.filter((v): v is number => typeof v === 'number');
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

// One number per metric for the whole session instead of a per-step breakdown — pitch/HNR/volume
// averaged across whichever steps returned them, jitter/shimmer from Sustained Vowel only (the
// only clean, controlled condition they're measured on).
export function summarizeVoiceFunction(steps: AcousticStepResult[] | null): VoiceFunctionSummary | null {
  if (!steps || steps.length === 0) return null;
  const usable = steps.filter(s => !s.qualityMessage);
  if (usable.length === 0) return null;
  const vowel = usable.find(s => s.label === 'Sustained Vowel') ?? usable[0];
  return {
    pitchHz: averagePresent(usable.map(s => s.medianF0Hz)),
    jitterPercent: vowel.jitterLocalPercent ?? null,
    shimmerPercent: vowel.shimmerLocalPercent ?? null,
    hnrDb: averagePresent(usable.map(s => s.meanHnrDb)),
    volumeDbfs: averagePresent(usable.map(s => s.relativeLevelDbfs)),
  };
}

export interface SpeechPerformanceSummary {
  wpm: number;
  matchPct: number | null;
}

// Rate and match collapsed into one number each for the whole session instead of a separate
// figure per step.
export function summarizeSpeechPerformance(
  tongueTwisters: { wpm: number; accuracyPct: number },
  readAloud: { wpm: number; matchPct: number },
  freeSpeech: { wpm: number }
): SpeechPerformanceSummary {
  const wpm = Math.round((tongueTwisters.wpm + readAloud.wpm + freeSpeech.wpm) / 3);
  const matchPct = Math.round((tongueTwisters.accuracyPct + readAloud.matchPct) / 2);
  return { wpm, matchPct };
}
