import { Ritual } from '../types';
import { ExperienceLevel, Goal, VoiceBarrier } from '../types/onboarding';
import { EXERCISE_RITUALS } from '../ritualsData';
import { supabase } from './supabase';

export type VoiceStatus = 'tired' | 'hoarse' | 'pressed' | 'shaky' | 'shallow_breath' | 'normal';

// Fixed clinical category order per voice status. The AI only picks which ritual fills each
// slot — it never reorders or substitutes categories. Categories are this app's real ones
// (Ground/Breathe/Warm Up/Release/Resonate/Build) — there is no separate "Flow"/"Calibrate".
const CATEGORY_SEQUENCES: Record<VoiceStatus, Ritual['category'][]> = {
  tired: ['Ground', 'Release', 'Resonate'],
  hoarse: ['Release', 'Ground', 'Resonate'],
  pressed: ['Ground', 'Breathe', 'Release'],
  shaky: ['Ground', 'Breathe', 'Warm Up'],
  shallow_breath: ['Warm Up', 'Breathe', 'Resonate'],
  normal: ['Warm Up', 'Build', 'Resonate'],
};

// Experience level now only affects difficulty, not count — a soft preference passed to Claude
// (and used as a tiebreak in the deterministic fallback), not a hard filter, same "prefer, don't
// exclude" pattern already used for the time-barrier duration preference.
const PREFERRED_DIFFICULTIES_BY_EXPERIENCE: Record<ExperienceLevel, Ritual['difficulty'][]> = {
  beginner: ['Beginner'],
  some_experience: ['Beginner', 'Intermediate'],
  trained: ['Intermediate', 'Advanced'],
};

const BASE_RITUAL_COUNT = 3;
const MIN_RITUAL_COUNT = 2;
const MAX_RITUAL_COUNT = 4;
const HIGH_EFFORT_THRESHOLD = 7;   // matches EFFORT_COLOR's high tier in WeeklyReportPage.tsx
const HIGH_DEMAND_THRESHOLD = 4;   // matches goalProgress.ts's HIGH_DEMAND_THRESHOLD (1-5 scale)
const LOW_EFFORT_THRESHOLD = 3;
const LOW_DEMAND_THRESHOLD = 2;
// A physical_demands barrier means the body is generally more taxed day-to-day, so today counts
// as "high load" a bit sooner than it otherwise would — one point more sensitive on both scales.
const PHYSICAL_DEMANDS_EFFORT_ADJUST = 1;
const PHYSICAL_DEMANDS_DEMAND_ADJUST = 1;

interface RecentLoadDay {
  vocalEffort: number;
  demandLevel: number | null;
}

// Decrease conditions take priority over increase ones — a demanding/rushed day never gets
// pushed to more rituals just because the last couple of days happened to be light.
function determineRitualCount(today: RecentLoadDay, recentDays: RecentLoadDay[], hasTimeBarrier: boolean, hasPhysicalDemandsBarrier: boolean): number {
  const effortThreshold = HIGH_EFFORT_THRESHOLD - (hasPhysicalDemandsBarrier ? PHYSICAL_DEMANDS_EFFORT_ADJUST : 0);
  const demandThreshold = HIGH_DEMAND_THRESHOLD - (hasPhysicalDemandsBarrier ? PHYSICAL_DEMANDS_DEMAND_ADJUST : 0);
  const highToday = today.vocalEffort >= effortThreshold || (today.demandLevel ?? 0) >= demandThreshold;
  if (highToday || hasTimeBarrier) return MIN_RITUAL_COUNT;

  // "Constant low" requires real evidence across the last 3 check-ins (today + 2 prior) — not
  // just today feeling easy — so this only fires once daily_checkins actually has that history.
  const last3 = [today, ...recentDays].slice(0, 3);
  const constantlyLow = last3.length === 3 && last3.every(
    d => d.vocalEffort <= LOW_EFFORT_THRESHOLD && (d.demandLevel == null || d.demandLevel <= LOW_DEMAND_THRESHOLD)
  );
  if (constantlyLow) return MAX_RITUAL_COUNT;

  return BASE_RITUAL_COUNT;
}

// Category sequences are always exactly 3 slots (the fixed clinical order). When the count is
// reduced, trim from the end; when increased beyond 3, extend by repeating the sequence's final
// (finishing/cool-down) category rather than its opening one — a judgment call worth revisiting.
function buildCategorySequence(voiceStatus: VoiceStatus, count: number): Ritual['category'][] {
  const base = CATEGORY_SEQUENCES[voiceStatus];
  if (count <= base.length) return base.slice(0, count);
  const extended = [...base];
  while (extended.length < count) extended.push(base[base.length - 1]);
  return extended;
}

export interface DailyCheckinContext {
  vocalEffort: number;
  demandLevel: number | null;
  vocalConfidence: number | null; // 1-5 — used to tell "nervous about confidence" from "confident, want to build on it"
  symptoms: string[];
  supportArea: string;   // "body scan area" — single required selection
  notes: string;          // optional status note — secondary context only, never overrides safety/structure
}

export interface ProfileContext {
  role: string | null;
  experienceLevel: ExperienceLevel | null;
  primaryGoal: Goal | null;
  voiceBarrier: VoiceBarrier | null;
}

export type EscalationReason = 'note' | 'persistent_pain';

export interface RitualSelectionResult {
  status: 'ok' | 'escalate';
  rituals: Ritual[];
  insight: string | null; // why these rituals were chosen, or (for escalate) why today was paused; null only for performance-mode
  escalationReason?: EscalationReason;
}

// The support area picker (RitualsPage.tsx check-in) is now a single required selection with
// its own full mapping to voice status — every option maps to something. Symptom-based checks
// still take priority when present, since they're a more direct signal than the body-scan area.
// 'Confidence' is handled separately below (see deriveVoiceStatus) since it splits on whether
// the user's actual confidence rating is low (nervous, needs steadying) or already high (wants
// to build on a strength) — mapping both to 'shaky' would misread someone who feels great.
const VOICE_STATUS_BY_SUPPORT_AREA: Record<string, VoiceStatus> = {
  'Breath & fatigue': 'shallow_breath',
  'Body tension': 'pressed',
  'Throat irritation': 'hoarse',
  'Recovery': 'tired',
};
const HIGH_CONFIDENCE_THRESHOLD = 4; // 1-5 scale
// A confidence_identity barrier means this IS the user's core stated growth area — so when
// they're already doing reasonably (not just clearly high) on confidence, lean into the
// empowering "build on this" framing a bit sooner than the default threshold would.
const CONFIDENCE_IDENTITY_THRESHOLD_ADJUST = 1;

function deriveVoiceStatus(checkin: DailyCheckinContext, hasConfidenceIdentityBarrier: boolean): VoiceStatus {
  const { symptoms, supportArea, vocalEffort, vocalConfidence } = checkin;
  if (symptoms.includes('Hoarse') || symptoms.includes('Dry')) return 'hoarse';
  if (symptoms.includes('Tight')) return 'pressed';
  if (supportArea === 'Confidence') {
    // Already feeling confident and chose this as their focus → building/expanding path
    // ('normal' sequence: Warm Up → Build → Resonate), not the nervous/steadying one.
    const threshold = HIGH_CONFIDENCE_THRESHOLD - (hasConfidenceIdentityBarrier ? CONFIDENCE_IDENTITY_THRESHOLD_ADJUST : 0);
    return (vocalConfidence ?? 0) >= threshold ? 'normal' : 'shaky';
  }
  const fromSupportArea = VOICE_STATUS_BY_SUPPORT_AREA[supportArea];
  if (fromSupportArea) return fromSupportArea;
  if (symptoms.includes('Fatigued') || symptoms.includes('Weak') || vocalEffort >= 7) return 'tired';
  return 'normal';
}

// Duplicated from goalProgress.ts's checkSafetyTrigger note-scanning approach rather than
// cross-imported, per this codebase's convention of duplicating small self-contained phrase
// scans (see weeklyCheckin.ts's mondayOf). Scans the optional status note for the four required
// escalation categories; the note is otherwise supplementary-only and must never affect anything
// else about selection.
const PAIN_PHRASES = ['pain', 'hurts', 'hurting', 'sharp pain', 'painful'];
const VOICE_LOSS_PHRASES = ['voice loss', 'lost my voice', "can't speak", 'no voice', 'lost voice'];
const BREATHING_DIFFICULTY_PHRASES = ["can't breathe", 'cant breathe', 'trouble breathing', 'breathing difficulty', 'shortness of breath', "can't catch my breath"];
const SWALLOWING_DIFFICULTY_PHRASES = ['trouble swallowing', 'difficulty swallowing', "can't swallow", 'cant swallow', 'swallowing difficulty'];

function checkEscalation(notes: string): boolean {
  const lower = notes.toLowerCase();
  return [...PAIN_PHRASES, ...VOICE_LOSS_PHRASES, ...BREATHING_DIFFICULTY_PHRASES, ...SWALLOWING_DIFFICULTY_PHRASES]
    .some(phrase => lower.includes(phrase));
}

// Catches the case a single day's note misses: pain mentioned on 2+ of the last few check-ins
// (today included) even if today's note itself doesn't repeat it — e.g. someone reported pain
// yesterday and the day before but left today's note blank. checkEscalation already handles a
// same-day pain mention, so this only fires on days that wouldn't otherwise have escalated.
const PERSISTENT_PAIN_LOOKBACK_DAYS = 2; // prior days checked, in addition to today
const PERSISTENT_PAIN_MIN_DAYS = 2; // total days (including today) needed to flag as persistent

async function checkPersistentPain(userId: string, todayNotes: string): Promise<boolean> {
  const todayHasPain = PAIN_PHRASES.some(phrase => todayNotes.toLowerCase().includes(phrase));

  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - PERSISTENT_PAIN_LOOKBACK_DAYS);
  const lookbackStartIso = lookbackStart.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from('daily_checkins')
    .select('notes')
    .eq('user_id', userId)
    .gte('date', lookbackStartIso)
    .lt('date', today);

  const priorPainDays = (rows ?? []).filter(
    r => PAIN_PHRASES.some(phrase => (r.notes ?? '').toLowerCase().includes(phrase))
  ).length;

  return priorPainDays + (todayHasPain ? 1 : 0) >= PERSISTENT_PAIN_MIN_DAYS;
}

interface EscalationInsightResponse {
  insight?: string;
}

async function fetchEscalationInsight(reason: EscalationReason, checkin: DailyCheckinContext): Promise<string> {
  const fallback = reason === 'persistent_pain'
    ? "You've mentioned pain a couple of days in a row now, so we've paused today's routine — it's worth having this checked by a doctor or voice professional before doing more."
    : "Your check-in mentioned something worth taking seriously, so today's routine has been paused — it may be worth checking in with a doctor or voice professional before practicing.";

  try {
    const res = await fetch('/api/escalation-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, notes: checkin.notes, supportArea: checkin.supportArea }),
    });
    if (!res.ok) throw new Error('escalation-insight request failed');
    const data = (await res.json()) as EscalationInsightResponse;
    return data.insight && data.insight.trim().length > 0 ? data.insight.trim() : fallback;
  } catch {
    return fallback;
  }
}

interface RitualFeedbackEntry {
  date: string;
  ritualId: string;
  goodness: number; // (feelingRating + (10 - difficultyRating)) / 2, same formula as goalProgress.ts
}

type FeedbackLabel = 'better' | 'same' | 'worse';

// For each ritual, compares its most recent completion's goodness against the average of its
// earlier completions (if any) — 'same' when there's no prior completion to compare against.
function classifyRecentFeedback(entries: RitualFeedbackEntry[]): Map<string, FeedbackLabel> {
  const byRitual = new Map<string, RitualFeedbackEntry[]>();
  for (const entry of entries) {
    const list = byRitual.get(entry.ritualId) ?? [];
    list.push(entry);
    byRitual.set(entry.ritualId, list);
  }

  const labels = new Map<string, FeedbackLabel>();
  for (const [ritualId, list] of byRitual) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const earlier = sorted.slice(0, -1);
    if (earlier.length === 0) {
      labels.set(ritualId, 'same');
      continue;
    }
    const earlierAvg = earlier.reduce((sum, e) => sum + e.goodness, 0) / earlier.length;
    const delta = latest.goodness - earlierAvg;
    labels.set(ritualId, delta > 0.5 ? 'better' : delta < -0.5 ? 'worse' : 'same');
  }
  return labels;
}

function fallbackSelection(
  categorySequence: Ritual['category'][],
  worseRatedRitualIds: Set<string>,
  preferredDifficulties: Ritual['difficulty'][],
): Ritual[] {
  return categorySequence
    .map(category => {
      const candidates = EXERCISE_RITUALS.filter(r => r.category === category);
      if (candidates.length === 0) return null;
      const untainted = candidates.filter(r => !worseRatedRitualIds.has(r.id));
      const pool = untainted.length > 0 ? untainted : candidates;
      const difficultyMatched = pool.filter(r => preferredDifficulties.includes(r.difficulty));
      return (difficultyMatched.length > 0 ? difficultyMatched : pool)[0];
    })
    .filter((r): r is Ritual => r != null);
}

interface SelectRitualsResponse {
  ritualIds: string[];
  insight?: string;
}

export async function selectRituals(
  userId: string,
  profile: ProfileContext,
  checkin: DailyCheckinContext,
  activePrepEvent: { tailoredRitualIds: string[] } | null,
): Promise<RitualSelectionResult> {
  // Performance mode always wins — skips the Claude call, the safety check, everything.
  if (activePrepEvent && activePrepEvent.tailoredRitualIds.length > 0) {
    const rituals = activePrepEvent.tailoredRitualIds
      .map(id => EXERCISE_RITUALS.find(r => r.id === id))
      .filter((r): r is Ritual => r != null);
    return { status: 'ok', rituals, insight: null };
  }

  if (checkEscalation(checkin.notes)) {
    const insight = await fetchEscalationInsight('note', checkin);
    return { status: 'escalate', rituals: [], insight, escalationReason: 'note' };
  }

  if (await checkPersistentPain(userId, checkin.notes)) {
    const insight = await fetchEscalationInsight('persistent_pain', checkin);
    return { status: 'escalate', rituals: [], insight, escalationReason: 'persistent_pain' };
  }

  const hasTimeBarrier = profile.voiceBarrier === 'time_consistency';
  const hasPhysicalDemandsBarrier = profile.voiceBarrier === 'physical_demands';
  const hasConfidenceIdentityBarrier = profile.voiceBarrier === 'confidence_identity';
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoIso = twoDaysAgo.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const { data: recentCheckinRows } = await supabase
    .from('daily_checkins')
    .select('date, vocal_effort, voice_demand_level')
    .eq('user_id', userId)
    .gte('date', twoDaysAgoIso)
    .lt('date', today)
    .order('date', { ascending: false });

  const recentDays: RecentLoadDay[] = (recentCheckinRows ?? [])
    .map(r => ({ vocalEffort: r.vocal_effort, demandLevel: r.voice_demand_level }));

  const ritualCount = determineRitualCount({ vocalEffort: checkin.vocalEffort, demandLevel: checkin.demandLevel }, recentDays, hasTimeBarrier, hasPhysicalDemandsBarrier);
  const voiceStatus = deriveVoiceStatus(checkin, hasConfidenceIdentityBarrier);
  const categorySequence = buildCategorySequence(voiceStatus, ritualCount);
  const baseDifficulties = profile.experienceLevel ? PREFERRED_DIFFICULTIES_BY_EXPERIENCE[profile.experienceLevel] : ['Beginner', 'Intermediate'] as Ritual['difficulty'][];
  // A physical_demands barrier nudges toward gentler execution regardless of skill level — the
  // body is more taxed day-to-day, so 'Beginner' stays in the preferred set even for experienced
  // users who'd otherwise only get Intermediate/Advanced.
  const preferredDifficulties: Ritual['difficulty'][] = hasPhysicalDemandsBarrier && !baseDifficulties.includes('Beginner')
    ? ['Beginner', ...baseDifficulties]
    : baseDifficulties;

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const fourteenDaysAgoIso = fourteenDaysAgo.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: feedbackRows } = await supabase
    .from('ritual_completions')
    .select('date, ritual_id, feeling_rating, difficulty_rating')
    .eq('user_id', userId)
    .gte('date', fourteenDaysAgoIso);

  const feedbackEntries: RitualFeedbackEntry[] = (feedbackRows ?? [])
    .filter(r => r.feeling_rating != null || r.difficulty_rating != null)
    .map(r => {
      const feeling = r.feeling_rating ?? 5;
      const difficulty = r.difficulty_rating ?? 5;
      return { date: r.date, ritualId: r.ritual_id, goodness: (feeling + (10 - difficulty)) / 2 };
    });

  const labels14d = classifyRecentFeedback(feedbackEntries);
  const worseRatedRitualIds = new Set([...labels14d.entries()].filter(([, label]) => label === 'worse').map(([id]) => id));

  const recentFeedback7d = feedbackEntries
    .filter(e => e.date >= sevenDaysAgoIso)
    .map(e => ({ ritualId: e.ritualId, label: labels14d.get(e.ritualId) ?? 'same' }));

  const ritualLibrary = EXERCISE_RITUALS.map(r => ({ id: r.id, name: r.name, category: r.category, duration: r.duration, difficulty: r.difficulty }));

  try {
    const res = await fetch('/api/select-rituals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        checkin: { ...checkin, voiceStatus },
        categorySequence,
        ritualCount,
        recentFeedback7d,
        worseRatedRitualIds: [...worseRatedRitualIds],
        ritualLibrary,
        hasTimeBarrier,
        hasPhysicalDemandsBarrier,
        preferredDifficulties,
      }),
    });
    if (!res.ok) throw new Error('select-rituals request failed');
    const data = (await res.json()) as SelectRitualsResponse;
    const rituals = (data.ritualIds ?? [])
      .map(id => EXERCISE_RITUALS.find(r => r.id === id))
      .filter((r): r is Ritual => r != null);
    if (rituals.length === 0) throw new Error('no valid rituals returned');
    return { status: 'ok', rituals, insight: data.insight ?? null };
  } catch {
    const fallbackInsight = checkin.supportArea === 'Confidence' && (checkin.vocalConfidence ?? 0) >= HIGH_CONFIDENCE_THRESHOLD
      ? "You're feeling confident today — today's routine builds on that strength."
      : `Today's routine was put together from your check-in — focused on your ${checkin.supportArea.toLowerCase()} and today's ${voiceStatus.replace('_', ' ')} voice status.`;
    return {
      status: 'ok',
      rituals: fallbackSelection(categorySequence, worseRatedRitualIds, preferredDifficulties),
      insight: fallbackInsight,
    };
  }
}
