export interface VocalReport {
  id: string;
  ritualName: string;
  category: string;
  date: string;
  duration: string;
  fatigueLevel: number;
  feelings: string[];
  notes: string;
  insight: string;
  pitchHz?: number;
  pitchRangeHz?: number;
  resonanceScore?: number;
  clarityPct?: number;
}

export type Role = 'teacher' | 'trainer' | 'speaker' | 'executive' | 'creator' | 'singer' | 'therapy' | 'other';
export type ExperienceLevel = 'beginner' | 'some_experience' | 'trained';
export type VoiceIdentity = 'vocal_athlete' | 'confident_leader' | 'calm_commanding' | 'custom';
export type Goal = 'reduce_strain' | 'build_endurance' | 'improve_clarity' | 'own_my_voice' | 'calm_my_nerves' | 'sound_confident';
export type Symptom = 'hoarseness' | 'fatigue' | 'pain' | 'dryness' | 'tension' | 'breathiness';

export interface HabitPair {
  daily: string;
  vocal: string;
}

export interface OnboardingData {
  role: Role | null;
  experienceLevel: ExperienceLevel | null;
  desiredVoiceTraits: string[];
  voiceIdentity: VoiceIdentity | null;
  customIdentity: string;
  goals: Goal[];
  effortScore: number;
  confidenceScore: number;
  symptoms: Symptom[];
  habitPairs: HabitPair[];
}
