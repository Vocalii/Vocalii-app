// Per-section results for the Voice Analyzer's 4 recorded steps — replaces the old acoustic
// scoring (pitch/resonance/clarity/stability/fatigue below) with plain, literally-true
// measurements. Its presence on a VocalReport is what distinguishes a report saved after this
// change from an older one that still only has the acoustic fields populated.
// One word in the word-by-word comparison of a transcript against the prompt text. `target` is the
// word as written in the prompt, `heard` the word as transcribed. A target-word match only — not a
// measure of pronunciation or intelligibility.
export interface WordMatchOp {
  type: 'correct' | 'substituted' | 'omitted' | 'added';
  target?: string;
  heard?: string;
}

export interface WordMatchDetail {
  ops: WordMatchOp[];
  correct: number;
  substituted: number;
  omitted: number;
  added: number;
  referenceWordCount: number;
  // Target words that were missed or came out as a different word, de-duplicated, in prompt order.
  wordsToRetry: string[];
}

export interface VoiceAnalyzerSections {
  sustainedVowel: { pass: boolean; reasonIfFailed: string | null };
  // `attempts` holds one entry per recording — usually 1, but can be more if the person used
  // "Try Another Prompt" to redo with a fresh phrase; wpm/accuracyPct above are the average across
  // all of them. Optional so older saved reports (pre-multi-attempt) still satisfy this shape.
  tongueTwisters: {
    wpm: number;
    accuracyPct: number;
    transcript: string | null;
    attempts?: { prompt: string; transcript: string | null; wpm: number; accuracyPct: number; match?: WordMatchDetail }[];
  };
  readAloud: {
    wpm: number;
    matchPct: number;
    transcript: string | null;
    attempts?: { prompt: string; transcript: string | null; wpm: number; matchPct: number; match?: WordMatchDetail }[];
  };
  freeSpeech: { wpm: number; wordCount: number; transcript: string | null };
  // Per-step results from the voice-analysis-service; null when the service was unavailable.
  acoustics: AcousticStepResult[] | null;
  // Optional Hume-derived expressive delivery observations for Read Aloud + Free Speech. Absent
  // (not empty) when Hume was unavailable or nothing cleared the confidence threshold.
  expressiveDelivery?: ExpressiveCategoryResult[];
}

export interface AcousticStepResult {
  label: string;
  // Absent when that recording failed the service's quality gate (see qualityMessage).
  medianF0Hz?: number | null;
  pitchP10Hz?: number | null;
  pitchP90Hz?: number | null;
  pitchRangeSemitones?: number | null;
  pitchVariabilitySdSemitones?: number | null;
  meanHnrDb?: number | null;
  jitterLocalPercent?: number | null;
  shimmerLocalPercent?: number | null;
  // Relative to this session's own mic/room, not an absolute loudness.
  relativeLevelDbfs?: number | null;
  qualityMessage?: string;
}

// Descriptive, not scored — no band, no number. Clarity/Speech Flow/Expression/Voice Quality, each
// grounded in Hume's real expression/voice-attribute labels (see HUME_CATEGORIES in server.ts).
export interface ExpressiveCategoryResult {
  key: 'clarity' | 'speechFlow' | 'expression' | 'voiceQuality';
  label: string;
  // Plain-English phrases for whichever of this category's Hume labels actually fired this
  // session — specific to the recording, not a generic description of what the category covers.
  words: string[];
  // AI-written description interpreting `words` together (and, for Speech Flow, the transcript's
  // actual filler/repetition patterns) — see /api/expressive-delivery-insight. Absent when the API
  // key is missing, the call failed, or this is an older report saved before descriptions existed.
  description?: string;
}

export interface VocalReport {
  id: string;
  name?: string;
  ritualName: string;
  category: string;
  date: string;
  duration: string;
  fatigueLevel: number;
  feelings: string[];
  notes: string;
  // Speech-performance insight (Sustained Vowel/Tongue Twisters/Read Aloud/Free Speech numbers +
  // feelings) — shown inside the Speech Performance card. Expressive delivery has its own separate
  // per-category descriptions now (sections.expressiveDelivery[].description), not folded into this.
  insight: string;
  // Old acoustic fields — kept for reports saved before the Voice Analyzer refactor; no longer
  // populated by new reports (see `sections` below instead).
  pitchHz?: number;
  pitchRangeHz?: number;
  resonanceScore?: number;
  clarityPct?: number;
  loudnessDb?: number;
  stabilityPct?: number;
  sections?: VoiceAnalyzerSections;
  favourite?: boolean;
}

export type Role = 'teacher' | 'trainer' | 'speaker' | 'executive' | 'creator' | 'singer' | 'therapy' | 'other';
export type ExperienceLevel = 'beginner' | 'some_experience' | 'trained';
export type VoiceIdentity = 'vocal_athlete' | 'confident_leader' | 'calm_commanding' | 'custom';
export type Goal = 'reduce_strain' | 'build_endurance' | 'improve_clarity' | 'own_my_voice' | 'build_routine' | 'calm_my_nerves' | 'sound_confident';
export type Symptom = 'hoarseness' | 'fatigue' | 'pain' | 'dryness' | 'tension' | 'breathiness';
export type VoiceBarrier = 'time_consistency' | 'confidence_identity' | 'physical_demands' | 'none';

export interface HabitPair {
  daily: string;
  vocal: string;
}

export interface OnboardingData {
  firstName: string;
  lastName: string;
  role: Role | null;
  experienceLevel: ExperienceLevel | null;
  desiredVoiceTraits: string[];
  voiceStatement: string;
  voiceIdentity: VoiceIdentity | null;
  customIdentity: string;
  goals: Goal[];
  effortScore: number;
  confidenceScore: number;
  symptoms: Symptom[];
  voiceBarrier: VoiceBarrier | null;
  habitPairs: HabitPair[];
  baselineMetrics?: import('../components/BaselineFlow').BaselineMetrics;
}
