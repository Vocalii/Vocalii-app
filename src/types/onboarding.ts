// Per-section results for the Voice Analyzer's 4 recorded steps — replaces the old acoustic
// scoring (pitch/resonance/clarity/stability/fatigue below) with plain, literally-true
// measurements. Its presence on a VocalReport is what distinguishes a report saved after this
// change from an older one that still only has the acoustic fields populated.
export interface VoiceAnalyzerSections {
  sustainedVowel: { pass: boolean; reasonIfFailed: string | null };
  // `attempts` holds one entry per recording — usually 1, but can be more if the person used
  // "Try Another Prompt" to redo with a fresh phrase; wpm/accuracyPct above are the average across
  // all of them. Optional so older saved reports (pre-multi-attempt) still satisfy this shape.
  tongueTwisters: {
    wpm: number;
    accuracyPct: number;
    transcript: string | null;
    attempts?: { prompt: string; transcript: string | null; wpm: number; accuracyPct: number }[];
  };
  readAloud: {
    wpm: number;
    matchPct: number;
    transcript: string | null;
    attempts?: { prompt: string; transcript: string | null; wpm: number; matchPct: number }[];
  };
  freeSpeech: { wpm: number; wordCount: number; transcript: string | null };
  // Reserved for a future validated acoustic-analysis service — always null today.
  acoustics: null;
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
  // 1-3 rituals the AI recommended for this specific session, based on its insight — resolved
  // back to full Ritual objects at display time via EXERCISE_RITUALS.find(). Scoped to this report
  // only; never written to daily_checkins or any other ritual-selection system.
  recommendedRituals?: { ritualId: string; reason: string }[];
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
