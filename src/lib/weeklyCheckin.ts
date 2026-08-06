import { Goal } from '../types/onboarding';

// Two questions per goal, shown as 0-10 sliders in the weekly check-in.
// The second question is reverse-scored for build_endurance/improve_clarity — see
// REVERSE_SCORED_GOALS below. calm_my_nerves/sound_confident are legacy values no longer
// selectable in onboarding/profile (kept only for old saved data) — they reuse own_my_voice's
// copy as a harmless fallback so this Record stays total over the full Goal union.
export const GOAL_QUESTIONS: Record<Goal, [string, string]> = {
  reduce_strain: [
    'How manageable did your voice feel during situations that usually require effort this week?',
    'How often did you notice strain, tightness, or discomfort when speaking this week?',
  ],
  build_endurance: [
    'How well did your voice hold up during your most demanding speaking moments this week?',
    'How quickly did your voice feel back to normal after a heavy voice day this week?',
  ],
  improve_clarity: [
    'How clearly did your voice communicate what you intended this week?',
    'How often did you need to repeat yourself or feel misunderstood when speaking this week?',
  ],
  own_my_voice: [
    'How closely did your voice match the way you want to sound and be heard this week?',
    'How natural and authentic did your voice feel when it mattered most this week?',
  ],
  build_routine: [
    'How consistently did you use your planned voice-care routine when it would have helped this week?',
    'When you missed a ritual this week, how easy was it to get back on track?',
  ],
  calm_my_nerves: [
    'How closely did your voice match the way you want to sound and be heard this week?',
    'How natural and authentic did your voice feel when it mattered most this week?',
  ],
  sound_confident: [
    'How closely did your voice match the way you want to sound and be heard this week?',
    'How natural and authentic did your voice feel when it mattered most this week?',
  ],
};

// Goals whose second question is reverse-scored (a LOWER answer means better performance —
// less strain noticed, less recovery time needed, less need to repeat yourself). Progress-scoring
// code (goalProgress.ts) imports this array directly and inverts (10 - value) for these before
// averaging with other signals. The raw value is stored as-is in weekly_checkins.goal_question_2;
// this flag exists so scoring logic knows to invert it.
export const REVERSE_SCORED_GOALS: Goal[] = ['reduce_strain', 'build_endurance', 'improve_clarity'];

// Two questions per trait, keyed by the exact labels in ScreenVoiceTraits.tsx's TRAITS array.
export const TRAIT_QUESTIONS: Record<string, [string, string]> = {
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

// Universal questions asked regardless of goal or trait.
export const UNIVERSAL_QUESTIONS = {
  voiceConfidence: 'Overall, how confident were you in your voice this week?',
  reflection: 'What was one win or challenge with your voice this week? (optional)',
};

export const REFLECTION_MAX_LENGTH = 500;

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

// Returns the Monday (YYYY-MM-DD) of the most recently *concluded* Mon-Sun week as of `today`.
// On a Sunday, that's the week containing today (today IS its last day). On Mon-Sat, it's last
// week (this week isn't over yet). This single rule implements the "due from Sunday through the
// following Saturday" window without separate day-of-week gating: the returned week_start only
// advances once a week, on Sunday, and stays pinned to the same value for the following Mon-Sat
// — so "is this week's check-in still open" reduces to "does a row already exist for this
// week_start" (checked wherever this is called from).
export function getReflectionWeekStart(today: Date = new Date()): string {
  const thisMonday = mondayOf(today);
  const isSunday = today.getDay() === 0;
  const start = isSunday ? thisMonday : new Date(thisMonday.getTime() - 7 * 86400000);
  return start.toISOString().slice(0, 10);
}

const MIN_ACCOUNT_AGE_FOR_WEEKLY_DAYS = 3;

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Earliest date (YYYY-MM-DD) a new user can be shown the weekly check-in/report: at least
// MIN_ACCOUNT_AGE_FOR_WEEKLY_DAYS days old AND on/after the first Sunday since signup, whichever
// is later — so someone who signs up right before a Sunday still waits for a real first week, and
// someone who just missed a Sunday isn't stuck waiting almost a full week beyond the 3-day floor.
export function weeklyEligibleDateIso(signupIso: string): string {
  const minAgeIso = addDaysIso(signupIso, MIN_ACCOUNT_AGE_FOR_WEEKLY_DAYS);
  const signupDow = new Date(signupIso + 'T00:00:00').getDay();
  const daysToFirstSunday = (7 - signupDow) % 7; // 0 if signup day itself is Sunday
  const firstSundayIso = addDaysIso(signupIso, daysToFirstSunday);
  return minAgeIso > firstSundayIso ? minAgeIso : firstSundayIso; // ISO dates compare lexically
}

// Days remaining (0 = eligible today) until the weekly check-in/report can be shown.
export function daysUntilWeeklyEligible(signupIso: string, todayIso: string = new Date().toISOString().slice(0, 10)): number {
  const eligibleIso = weeklyEligibleDateIso(signupIso);
  const eligible = new Date(eligibleIso + 'T00:00:00');
  const today = new Date(todayIso + 'T00:00:00');
  return Math.max(0, Math.round((eligible.getTime() - today.getTime()) / 86400000));
}
