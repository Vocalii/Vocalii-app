import { Goal } from '../types/onboarding';
import { REVERSE_SCORED_GOALS } from './weeklyCheckin';

export type GoalProgressStatus =
  | 'IMPROVING'
  | 'HOLDING_STEADY'
  | 'NEEDS_SUPPORT'
  | 'GOAL_ACHIEVED'
  | 'MORE_DATA_NEEDED';

export const GOAL_PROGRESS_RULE_VERSION = 'v1';

const PERCENT_MEANINGFUL_CHANGE = 10;
const HIGH_DEMAND_THRESHOLD = 4; // matches VoiceHealthStatus.tsx's getDemandLevel High cutoff
const TARGET_SUSTAIN_WEEKS = 2;
// Minimum real-calendar-day spread between a goal's earliest and most recent data point before a
// trend is trusted. Deliberately NOT "2 calendar weeks" (bucketIntoWeeks' Monday-Sunday buckets can
// make that take up to 13 days depending what day the user started on) — this is a plain day-count
// so a new user only ever waits about a week, regardless of which day they started.
const MIN_DATA_SPAN_DAYS = 8;

// daily_checkins.symptoms vocabulary (RitualsPage.tsx check-in step 1) — 'Sore'/'Tight'
// are this table's pain/tension equivalents. vocal_reports.feelings uses a different,
// longer-form vocabulary and is not scanned by symptom (only by note text, below).
const STRAIN_SAFETY_SYMPTOMS = ['Sore', 'Tight'];
const STRAIN_SUPPORT_SYMPTOMS = ['Tight', 'Fatigued', 'Hoarse'];
const VOICE_LOSS_PHRASES = ['voice loss', 'lost my voice', "can't speak", 'no voice', 'lost voice'];

export interface WeeklyObservation {
  weekStart: string;
  value: number | null;
  sampleCount: number;
}

export interface GoalProgressOutput {
  status: GoalProgressStatus;
  ruleVersion: string;
  primaryValue: number | null;
  priorValue: number | null;
  target: number;
  safetyTriggered: boolean;
  observationsCount: number;
  contributingFactors: Record<string, number | string | boolean | null>;
}

export interface SafetyCheckInput {
  recentSymptoms: string[][]; // symptoms[] arrays from last 3 daily_checkins, most-recent-first
  recentNotes: string[];      // daily_checkins.notes + vocal_reports.notes, last ~5 entries
}

export function checkSafetyTrigger(input: SafetyCheckInput): boolean {
  const flaggedCheckins = input.recentSymptoms
    .slice(0, 3)
    .filter(symptoms => symptoms.some(s => STRAIN_SAFETY_SYMPTOMS.includes(s))).length;
  if (flaggedCheckins >= 2) return true;

  const lowerNotes = input.recentNotes.map(n => n.toLowerCase());
  return lowerNotes.some(note => VOICE_LOSS_PHRASES.some(phrase => note.includes(phrase)));
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

// Groups daily points into Monday-Sunday week buckets, returns the most recent
// `weekCount` weeks (including the partial current week), oldest first.
export function bucketIntoWeeks(points: DailyPoint[], weekCount: number): WeeklyObservation[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + diffToMonday);

  const weeks: WeeklyObservation[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStartDate = new Date(thisMonday);
    weekStartDate.setDate(thisMonday.getDate() - i * 7);
    const weekStart = weekStartDate.toISOString().slice(0, 10);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);

    const inWeek = points.filter(p => p.date >= weekStart && p.date <= weekEnd);
    const value = inWeek.length > 0 ? inWeek.reduce((sum, p) => sum + p.value, 0) / inWeek.length : null;
    weeks.push({ weekStart, value, sampleCount: inWeek.length });
  }
  return weeks;
}

// A week's weekly_checkins answer to a goal's two questions, reduced to a single 0-10 "goodness"
// score (higher = better), with REVERSE_SCORED_GOALS inversion already applied by the caller.
export interface WeeklySelfReportPoint {
  weekStart: string;
  goodness: number | null;
}

// Weight given to a single weekly self-report answer when blended into a week's bucketed average,
// expressed in "worth this many daily check-ins" — less than a fully-observed week (5-7 daily
// check-ins) but more than a single day, so an active week's daily signal still dominates while a
// sparse week leans on it more.
const WEEKLY_SELF_REPORT_WEIGHT = 2;

// Folds a weekly self-report goodness score (0-10, higher = better) into each week's bucketed
// value, converting it to that goal's native scale via `toNativeScale` first. Weeks with no
// self-report for that weekStart, or a null goodness, pass through unchanged.
function blendWeeklySelfReport(
  weeks: WeeklyObservation[],
  selfReports: WeeklySelfReportPoint[],
  toNativeScale: (goodness: number) => number,
): WeeklyObservation[] {
  const goodnessByWeek = new Map(selfReports.map(s => [s.weekStart, s.goodness]));
  return weeks.map(w => {
    const goodness = goodnessByWeek.get(w.weekStart);
    if (goodness == null) return w;
    const nativeEquivalent = toNativeScale(goodness);
    if (w.value == null) {
      return { ...w, value: nativeEquivalent, sampleCount: w.sampleCount + WEEKLY_SELF_REPORT_WEIGHT };
    }
    const blendedValue = (w.value * w.sampleCount + nativeEquivalent * WEEKLY_SELF_REPORT_WEIGHT) / (w.sampleCount + WEEKLY_SELF_REPORT_WEIGHT);
    return { ...w, value: blendedValue, sampleCount: w.sampleCount + WEEKLY_SELF_REPORT_WEIGHT };
  });
}

// Earliest-to-latest spread, in whole calendar days, across a set of YYYY-MM-DD date strings.
// Returns 0 if fewer than 2 distinct dates are given.
function daysSpanOf(dates: string[]): number {
  if (dates.length < 2) return 0;
  const sorted = [...dates].sort();
  const earliest = new Date(sorted[0] + 'T00:00:00');
  const latest = new Date(sorted[sorted.length - 1] + 'T00:00:00');
  return Math.round((latest.getTime() - earliest.getTime()) / 86400000) + 1;
}

// A single ritual_completions row's post-ritual feedback.
export interface RitualFeedbackRow {
  date: string;
  feelingRating: number | null;
  difficultyRating: number | null;
}

// Reduces a ritual completion's two ratings to a single 0-10 "goodness" score (higher = better):
// averages feelingRating with the inverted difficultyRating (lower difficulty = better), using
// whichever of the two are present. Null if neither is.
function ritualFeedbackGoodness(row: RitualFeedbackRow): number | null {
  const invertedDifficulty = row.difficultyRating != null ? 10 - row.difficultyRating : null;
  const values = [row.feelingRating, invertedDifficulty].filter((v): v is number => v != null);
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

// Ritual feedback is the primary signal for reduce_strain/build_endurance (vocal_effort from the
// daily check-in is a minor secondary input for those two goals — see below). Each rated
// completion counts as this many points in a week's average by default...
const RITUAL_FEEDBACK_BASE_WEIGHT = 2;
// ...and this many times more when the completion happened on a high-demand day (matches
// VoiceHealthStatus.tsx's demand-level concept — strain/endurance on a demanding day matters more).
const RITUAL_FEEDBACK_HIGH_DEMAND_MULTIPLIER = 2;

// Converts rated ritual completions into extra effort-scale DailyPoints (1-10, lower = better,
// matching vocal_effort's scale) so they can be merged directly into the same array bucketed by
// bucketIntoWeeks. A point is duplicated to give it weight — plain averaging then gives
// higher-weighted points proportionally more influence without changing bucketIntoWeeks itself.
// Applies on every day (not just high-demand ones); `highDemandDates` only controls the multiplier.
function ritualFeedbackEffortPoints(rows: RitualFeedbackRow[], highDemandDates: Set<string>): DailyPoint[] {
  const points: DailyPoint[] = [];
  for (const row of rows) {
    const goodness = ritualFeedbackGoodness(row);
    if (goodness == null) continue;
    const value = 10 - goodness;
    const weight = highDemandDates.has(row.date)
      ? RITUAL_FEEDBACK_BASE_WEIGHT * RITUAL_FEEDBACK_HIGH_DEMAND_MULTIPLIER
      : RITUAL_FEEDBACK_BASE_WEIGHT;
    for (let i = 0; i < weight; i++) points.push({ date: row.date, value });
  }
  return points;
}

export interface StatusLadderInput {
  safetyTriggered: boolean;
  observationsCount: number;
  weeklyValues: WeeklyObservation[];
  daysSpan: number;
  target: number;
  targetDirection: 'at_or_below' | 'at_or_above';
  meaningfulChangeThreshold: number;
  targetSustainWeeks: number;
}

export function computeStatusLadder(input: StatusLadderInput): { status: GoalProgressStatus; primaryValue: number | null; priorValue: number | null } {
  // Rule 1: safety always overrides everything else
  if (input.safetyTriggered) return { status: 'NEEDS_SUPPORT', primaryValue: null, priorValue: null };

  // Rule 2: missing data = MORE_DATA_NEEDED, never assume Holding Steady. Gated on a plain
  // day-count spread (not "2 calendar-week buckets") so a new user waits ~8 days, not up to 13.
  if (input.observationsCount < 3 || input.daysSpan < MIN_DATA_SPAN_DAYS) {
    return { status: 'MORE_DATA_NEEDED', primaryValue: null, priorValue: null };
  }

  const nonNullWeeks = input.weeklyValues.filter(w => w.value != null);
  if (nonNullWeeks.length < 2) {
    return { status: 'MORE_DATA_NEEDED', primaryValue: nonNullWeeks[0]?.value ?? null, priorValue: null };
  }

  const latest = nonNullWeeks[nonNullWeeks.length - 1];
  const prior = nonNullWeeks[nonNullWeeks.length - 2];
  const atTarget = (v: number) => input.targetDirection === 'at_or_below' ? v <= input.target : v >= input.target;

  // Rule 3: primary measure at target for N consecutive weekly observations
  const lastN = nonNullWeeks.slice(-input.targetSustainWeeks);
  if (lastN.length === input.targetSustainWeeks && lastN.every(w => atTarget(w.value as number))) {
    return { status: 'GOAL_ACHIEVED', primaryValue: latest.value, priorValue: prior.value };
  }

  const delta = (latest.value as number) - (prior.value as number);
  const worsened = input.targetDirection === 'at_or_below'
    ? delta >= input.meaningfulChangeThreshold
    : delta <= -input.meaningfulChangeThreshold;
  const improved = input.targetDirection === 'at_or_below'
    ? delta <= -input.meaningfulChangeThreshold
    : delta >= input.meaningfulChangeThreshold;

  // Rule 4: worsened by a meaningful amount across 2 observations
  if (worsened) return { status: 'NEEDS_SUPPORT', primaryValue: latest.value, priorValue: prior.value };
  // Rule 5: improved by a meaningful amount across 2 observations
  if (improved) return { status: 'IMPROVING', primaryValue: latest.value, priorValue: prior.value };
  // Rule 6: sufficient data, no meaningful change
  return { status: 'HOLDING_STEADY', primaryValue: latest.value, priorValue: prior.value };
}

export interface DailyCheckinRow {
  date: string;
  vocal_effort: number;
  voice_demand_level: number | null;
  voice_confidence: number | null;
  symptoms: string[];
  notes: string;
}

function lastNDays(checkins: DailyCheckinRow[], days: number): DailyCheckinRow[] {
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(today.getDate() - (days - 1));
  const cutoff = cutoffDate.toISOString().slice(0, 10);
  return checkins.filter(c => c.date >= cutoff);
}

function observationsInLast7Days(checkins: DailyCheckinRow[]): number {
  return lastNDays(checkins, 7).length;
}

function safetyFromCheckinsAndNotes(checkins: DailyCheckinRow[], extraNotes: string[]): boolean {
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
  const recentSymptoms = sorted.slice(0, 3).map(c => c.symptoms);
  const recentNotes = [...sorted.slice(0, 5).map(c => c.notes).filter(Boolean), ...extraNotes];
  return checkSafetyTrigger({ recentSymptoms, recentNotes });
}

export interface ReduceStrainInput {
  checkins: DailyCheckinRow[];
  weeklySelfReports?: WeeklySelfReportPoint[];
  ritualFeedback?: RitualFeedbackRow[];
}

export function computeReduceStrainProgress(input: ReduceStrainInput): GoalProgressOutput {
  const observationsCount = observationsInLast7Days(input.checkins);
  const safetyTriggered = safetyFromCheckinsAndNotes(input.checkins, []);
  // Ritual feedback is the primary signal here; the daily check-in's vocal_effort is a minor
  // secondary input (weight 1, unduplicated) alongside it. Unlike build_endurance, there's no
  // high-demand-day weight multiplier for this goal — every rated completion counts equally.
  const dailyPoints = [
    ...ritualFeedbackEffortPoints(input.ritualFeedback ?? [], new Set()),
    ...input.checkins.map(c => ({ date: c.date, value: c.vocal_effort })),
  ];
  let weeklyValues = bucketIntoWeeks(dailyPoints, 5);
  // vocal_effort is 1-10, lower = better; self-report goodness is 0-10, higher = better, so invert.
  if (input.weeklySelfReports) {
    weeklyValues = blendWeeklySelfReport(weeklyValues, input.weeklySelfReports, goodness => 10 - goodness);
  }
  const daysSpan = daysSpanOf([...dailyPoints.map(p => p.date), ...(input.weeklySelfReports ?? []).filter(w => w.goodness != null).map(w => w.weekStart)]);

  const ladder = computeStatusLadder({
    safetyTriggered,
    observationsCount,
    weeklyValues,
    daysSpan,
    target: 3,
    targetDirection: 'at_or_below',
    meaningfulChangeThreshold: 2,
    targetSustainWeeks: TARGET_SUSTAIN_WEEKS,
  });

  const strainSymptomDays = lastNDays(input.checkins, 7).filter(c => c.symptoms.some(s => STRAIN_SUPPORT_SYMPTOMS.includes(s))).length;

  return {
    status: ladder.status,
    ruleVersion: GOAL_PROGRESS_RULE_VERSION,
    primaryValue: ladder.primaryValue,
    priorValue: ladder.priorValue,
    target: 3,
    safetyTriggered,
    observationsCount,
    contributingFactors: {
      weeklyEffortAvg: ladder.primaryValue,
      strainSymptomDaysLast7: strainSymptomDays,
      ratedRitualCompletionsCount: (input.ritualFeedback ?? []).filter(r => ritualFeedbackGoodness(r) != null).length,
    },
  };
}

export interface BuildEnduranceInput {
  checkins: DailyCheckinRow[];
  weeklySelfReports?: WeeklySelfReportPoint[];
  ritualFeedback?: RitualFeedbackRow[];
}

export function computeBuildEnduranceProgress(input: BuildEnduranceInput): GoalProgressOutput {
  const observationsCount = observationsInLast7Days(input.checkins);
  const safetyTriggered = safetyFromCheckinsAndNotes(input.checkins, []);

  const highDemandDays = input.checkins.filter(c => (c.voice_demand_level ?? 0) >= HIGH_DEMAND_THRESHOLD);
  const highDemandDates = new Set(highDemandDays.map(c => c.date));
  // Ritual feedback is the primary signal here, counted on every day and weighted extra on
  // high-demand days. The daily check-in's vocal_effort on high-demand days is a minor secondary
  // input (weight 1, unduplicated) alongside it.
  const dailyPoints = [
    ...ritualFeedbackEffortPoints(input.ritualFeedback ?? [], highDemandDates),
    ...highDemandDays.map(c => ({ date: c.date, value: c.vocal_effort })),
  ];
  let weeklyValues = bucketIntoWeeks(dailyPoints, 5);
  // vocal_effort is 1-10, lower = better; self-report goodness is 0-10, higher = better, so invert.
  if (input.weeklySelfReports) {
    weeklyValues = blendWeeklySelfReport(weeklyValues, input.weeklySelfReports, goodness => 10 - goodness);
  }
  const daysSpan = daysSpanOf([...dailyPoints.map(p => p.date), ...(input.weeklySelfReports ?? []).filter(w => w.goodness != null).map(w => w.weekStart)]);

  const ladder = computeStatusLadder({
    safetyTriggered,
    observationsCount,
    weeklyValues,
    daysSpan,
    target: 3,
    targetDirection: 'at_or_below',
    meaningfulChangeThreshold: 2,
    targetSustainWeeks: TARGET_SUSTAIN_WEEKS,
  });

  // Supporting-only: average next-day effort delta after a high-demand day (lower/negative = faster recovery)
  const byDate = new Map(input.checkins.map(c => [c.date, c]));
  const recoveryDeltas: number[] = [];
  for (const day of highDemandDays) {
    const nextDate = new Date(day.date + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);
    const nextRow = byDate.get(nextDate.toISOString().slice(0, 10));
    if (nextRow) recoveryDeltas.push(nextRow.vocal_effort - day.vocal_effort);
  }
  const nextDayRecoveryDelta = recoveryDeltas.length > 0
    ? recoveryDeltas.reduce((a, b) => a + b, 0) / recoveryDeltas.length
    : null;

  return {
    status: ladder.status,
    ruleVersion: GOAL_PROGRESS_RULE_VERSION,
    primaryValue: ladder.primaryValue,
    priorValue: ladder.priorValue,
    target: 3,
    safetyTriggered,
    observationsCount,
    contributingFactors: {
      weeklyEffortAvg: ladder.primaryValue,
      nextDayRecoveryDelta,
      ratedRitualCompletionsCount: (input.ritualFeedback ?? []).filter(r => ritualFeedbackGoodness(r) != null).length,
      ratedRitualCompletionsOnHighDemandDaysCount: (input.ritualFeedback ?? []).filter(r => highDemandDates.has(r.date) && ritualFeedbackGoodness(r) != null).length,
    },
  };
}

export interface ImproveClarityInput {
  reports: { date: string; clarityPct: number | null }[]; // vocal_reports, any order
  reportNotes: string[]; // vocal_reports.notes, most-recent-first
  baselineClarityPct: number | null;
  checkins: DailyCheckinRow[]; // for observationsCount + safety scan only
  weeklySelfReports?: WeeklySelfReportPoint[];
}

export function computeImproveClarityProgress(input: ImproveClarityInput): GoalProgressOutput {
  const observationsCount = observationsInLast7Days(input.checkins);
  const safetyTriggered = safetyFromCheckinsAndNotes(input.checkins, input.reportNotes);

  if (input.baselineClarityPct == null) {
    return {
      status: safetyTriggered ? 'NEEDS_SUPPORT' : 'MORE_DATA_NEEDED',
      ruleVersion: GOAL_PROGRESS_RULE_VERSION,
      primaryValue: null,
      priorValue: null,
      target: 0,
      safetyTriggered,
      observationsCount,
      contributingFactors: { baselineClarityPct: null },
    };
  }

  const target = input.baselineClarityPct + 10;
  const points = input.reports
    .filter((r): r is { date: string; clarityPct: number } => r.clarityPct != null)
    .map(r => ({ date: r.date, value: r.clarityPct }));
  let weeklyValues = bucketIntoWeeks(points, 5);
  // clarityPct is 0-100, higher = better; self-report goodness is 0-10, higher = better.
  if (input.weeklySelfReports) {
    weeklyValues = blendWeeklySelfReport(weeklyValues, input.weeklySelfReports, goodness => goodness * 10);
  }
  const daysSpan = daysSpanOf([...points.map(p => p.date), ...(input.weeklySelfReports ?? []).filter(w => w.goodness != null).map(w => w.weekStart)]);

  const ladder = computeStatusLadder({
    safetyTriggered,
    observationsCount,
    weeklyValues,
    daysSpan,
    target,
    targetDirection: 'at_or_above',
    meaningfulChangeThreshold: PERCENT_MEANINGFUL_CHANGE,
    targetSustainWeeks: TARGET_SUSTAIN_WEEKS,
  });

  const weeklyConfidenceAvg = (() => {
    const confPoints = input.checkins
      .filter(c => c.voice_confidence != null)
      .map(c => ({ date: c.date, value: c.voice_confidence as number }));
    const buckets = bucketIntoWeeks(confPoints, 1);
    return buckets[buckets.length - 1]?.value ?? null;
  })();

  return {
    status: ladder.status,
    ruleVersion: GOAL_PROGRESS_RULE_VERSION,
    primaryValue: ladder.primaryValue,
    priorValue: ladder.priorValue,
    target,
    safetyTriggered,
    observationsCount,
    contributingFactors: {
      baselineClarityPct: input.baselineClarityPct,
      weeklyClarityAvg: ladder.primaryValue,
      weeklyConfidenceAvg,
    },
  };
}

export interface OwnMyVoiceInput {
  checkins: DailyCheckinRow[];
  weeklySelfReports?: WeeklySelfReportPoint[];
}

export function computeOwnMyVoiceProgress(input: OwnMyVoiceInput): GoalProgressOutput {
  const observationsCount = observationsInLast7Days(input.checkins);
  const safetyTriggered = safetyFromCheckinsAndNotes(input.checkins, []);

  const points = input.checkins
    .filter(c => c.voice_confidence != null)
    .map(c => ({ date: c.date, value: c.voice_confidence as number }));
  let weeklyValues = bucketIntoWeeks(points, 5);
  // voice_confidence is 1-5, higher = better; self-report goodness is 0-10, higher = better.
  if (input.weeklySelfReports) {
    weeklyValues = blendWeeklySelfReport(weeklyValues, input.weeklySelfReports, goodness => goodness / 2);
  }
  const daysSpan = daysSpanOf([...points.map(p => p.date), ...(input.weeklySelfReports ?? []).filter(w => w.goodness != null).map(w => w.weekStart)]);

  const ladder = computeStatusLadder({
    safetyTriggered,
    observationsCount,
    weeklyValues,
    daysSpan,
    target: 4, // rescaled from spec's "confidence >= 7 (of 10)" to this app's 1-5 scale
    targetDirection: 'at_or_above',
    meaningfulChangeThreshold: 1, // rescaled proportionally from the spec's "2 points" on a 1-10 scale
    targetSustainWeeks: TARGET_SUSTAIN_WEEKS,
  });

  return {
    status: ladder.status,
    ruleVersion: GOAL_PROGRESS_RULE_VERSION,
    primaryValue: ladder.primaryValue,
    priorValue: ladder.priorValue,
    target: 4,
    safetyTriggered,
    observationsCount,
    contributingFactors: {
      weeklyConfidenceAvg: ladder.primaryValue,
    },
  };
}

export interface BuildRoutineInput {
  ritualCompletions: { date: string }[];
  habitCompletions: { date: string; completed: boolean }[];
  dailyRitualCount: number;
  dailyHabitCount: number;
  checkins: DailyCheckinRow[]; // for observationsCount + safety scan only
  weeklySelfReports?: WeeklySelfReportPoint[];
}

export function computeBuildRoutineProgress(input: BuildRoutineInput): GoalProgressOutput {
  const observationsCount = observationsInLast7Days(input.checkins);
  const safetyTriggered = safetyFromCheckinsAndNotes(input.checkins, []);

  const denominator = input.dailyRitualCount + input.dailyHabitCount;

  const ritualCountByDate = new Map<string, number>();
  for (const r of input.ritualCompletions) {
    ritualCountByDate.set(r.date, (ritualCountByDate.get(r.date) ?? 0) + 1);
  }
  const habitCountByDate = new Map<string, number>();
  for (const h of input.habitCompletions) {
    if (h.completed) habitCountByDate.set(h.date, (habitCountByDate.get(h.date) ?? 0) + 1);
  }

  const allDates = new Set([...ritualCountByDate.keys(), ...habitCountByDate.keys()]);
  const dailyRatePoints: DailyPoint[] = denominator > 0
    ? Array.from(allDates).map(date => ({
        date,
        value: Math.min(100, ((ritualCountByDate.get(date) ?? 0) + (habitCountByDate.get(date) ?? 0)) / denominator * 100),
      }))
    : [];

  let weeklyValues = bucketIntoWeeks(dailyRatePoints, 5);
  // completion % is 0-100, higher = better; self-report goodness is 0-10, higher = better.
  if (input.weeklySelfReports) {
    weeklyValues = blendWeeklySelfReport(weeklyValues, input.weeklySelfReports, goodness => goodness * 10);
  }
  const daysSpan = daysSpanOf([...dailyRatePoints.map(p => p.date), ...(input.weeklySelfReports ?? []).filter(w => w.goodness != null).map(w => w.weekStart)]);

  const ladder = computeStatusLadder({
    safetyTriggered,
    observationsCount,
    weeklyValues,
    daysSpan,
    target: 70,
    targetDirection: 'at_or_above',
    meaningfulChangeThreshold: PERCENT_MEANINGFUL_CHANGE,
    targetSustainWeeks: TARGET_SUSTAIN_WEEKS,
  });

  // Supporting-only: fraction of 0-completion days (trailing 28d) followed within 2 days by a completion
  const completedDates = new Set([...ritualCountByDate.keys(), ...habitCountByDate.keys()]);
  const today = new Date();
  const missedDays: string[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (!completedDates.has(dateStr)) missedDays.push(dateStr);
  }
  const returned = missedDays.filter(missed => {
    const missedDate = new Date(missed + 'T00:00:00');
    for (let offset = 1; offset <= 2; offset++) {
      const checkDate = new Date(missedDate);
      checkDate.setDate(missedDate.getDate() + offset);
      if (completedDates.has(checkDate.toISOString().slice(0, 10))) return true;
    }
    return false;
  }).length;
  const returnRateAfterMissedDays = missedDays.length > 0 ? returned / missedDays.length : null;

  return {
    status: ladder.status,
    ruleVersion: GOAL_PROGRESS_RULE_VERSION,
    primaryValue: ladder.primaryValue,
    priorValue: ladder.priorValue,
    target: 70,
    safetyTriggered,
    observationsCount,
    contributingFactors: {
      weeklyCompletionPct: ladder.primaryValue,
      returnRateAfterMissedDays,
    },
  };
}

export interface WeeklyCheckinRow {
  weekStart: string;
  goalId: string;
  goalQuestion1: number | null;
  goalQuestion2: number | null;
}

export interface GoalProgressComputeInput {
  checkins: DailyCheckinRow[];
  reports: { date: string; clarityPct: number | null; notes: string }[];
  baselineClarityPct: number | null;
  ritualCompletions: { date: string }[];
  habitCompletions: { date: string; completed: boolean }[];
  dailyRitualCount: number;
  dailyHabitCount: number;
  weeklyCheckins?: WeeklyCheckinRow[];
  ritualFeedback?: RitualFeedbackRow[];
}

// Reduces a goal's two weekly_checkins answers to a single 0-10 "goodness" score (higher =
// better), inverting question 2 for goals in REVERSE_SCORED_GOALS. Averages whichever of the two
// answers are present; null if neither is.
function weeklySelfReportsForGoal(goal: Goal, rows: WeeklyCheckinRow[]): WeeklySelfReportPoint[] {
  const reverse = REVERSE_SCORED_GOALS.includes(goal);
  return rows
    .filter(r => r.goalId === goal)
    .map(r => {
      const q2 = r.goalQuestion2 != null && reverse ? 10 - r.goalQuestion2 : r.goalQuestion2;
      const values = [r.goalQuestion1, q2].filter((v): v is number => v != null);
      const goodness = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return { weekStart: r.weekStart, goodness };
    });
}

export function computeGoalProgress(goal: Goal, input: GoalProgressComputeInput): GoalProgressOutput {
  const weeklySelfReports = weeklySelfReportsForGoal(goal, input.weeklyCheckins ?? []);

  switch (goal) {
    case 'reduce_strain':
      return computeReduceStrainProgress({ checkins: input.checkins, weeklySelfReports, ritualFeedback: input.ritualFeedback });
    case 'build_endurance':
      return computeBuildEnduranceProgress({ checkins: input.checkins, weeklySelfReports, ritualFeedback: input.ritualFeedback });
    case 'improve_clarity':
      return computeImproveClarityProgress({
        reports: input.reports,
        reportNotes: input.reports.map(r => r.notes).filter(Boolean),
        baselineClarityPct: input.baselineClarityPct,
        checkins: input.checkins,
        weeklySelfReports,
      });
    case 'own_my_voice':
      return computeOwnMyVoiceProgress({ checkins: input.checkins, weeklySelfReports });
    case 'build_routine':
    default:
      return computeBuildRoutineProgress({
        ritualCompletions: input.ritualCompletions,
        habitCompletions: input.habitCompletions,
        dailyRitualCount: input.dailyRitualCount,
        dailyHabitCount: input.dailyHabitCount,
        checkins: input.checkins,
        weeklySelfReports,
      });
  }
}
