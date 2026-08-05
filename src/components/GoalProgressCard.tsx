import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, ArrowDown, Minus, Trophy, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Goal } from '../types/onboarding';
import { GOALS } from './onboarding/ScreenGoals';
import {
  computeGoalProgress,
  GoalProgressOutput,
  GoalProgressStatus,
  GOAL_PROGRESS_RULE_VERSION,
  DailyCheckinRow,
} from '../lib/goalProgress';

interface Props {
  userId: string | null;
  goal: Goal | null;
  dailyRitualIds: string[];
  habitPairsCount: number;
}

const STATUS_STYLES: Record<GoalProgressStatus, { label: string; color: string; bg: string; border: string; fill: string }> = {
  GOAL_ACHIEVED: { label: 'Goal Achieved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', fill: '#34d399' },
  IMPROVING: { label: 'Improving', color: 'text-[#2fb8d6]', bg: 'bg-[#2fb8d6]/10', border: 'border-[#2fb8d6]/20', fill: '#2fb8d6' },
  HOLDING_STEADY: { label: 'Holding Steady', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', fill: '#c084fc' },
  NEEDS_SUPPORT: { label: 'Needs Support', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', fill: '#ef4444' },
  MORE_DATA_NEEDED: { label: 'More Data Needed', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', fill: '#a1a1aa' },
};

const STATUS_DESCRIPTIONS: Record<GoalProgressStatus, string> = {
  GOAL_ACHIEVED: "You've hit your target and held it for two weeks running. Nice work.",
  IMPROVING: 'Your trend is moving in the right direction over the last two weeks.',
  HOLDING_STEADY: "You're consistent — no big swings up or down recently.",
  NEEDS_SUPPORT: 'Recent data suggests this could use some attention.',
  MORE_DATA_NEEDED: 'Log a few more check-ins to see a trend here.',
};

function unitFor(goal: Goal): string {
  switch (goal) {
    case 'reduce_strain':
    case 'build_endurance':
      return '/10';
    case 'own_my_voice':
      return '/5';
    default:
      return '%';
  }
}

export default function GoalProgressCard({ userId, goal, dailyRitualIds, habitPairsCount }: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<GoalProgressOutput | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!userId || !goal) {
      setLoading(false);
      setResult(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const today = new Date();
    const d28 = new Date(today);
    d28.setDate(today.getDate() - 27);
    const d28Str = d28.toISOString().slice(0, 10);
    const d35 = new Date(today);
    d35.setDate(today.getDate() - 34);
    const d35Str = d35.toISOString().slice(0, 10);

    Promise.all([
      supabase.from('daily_checkins')
        .select('date, vocal_effort, voice_demand_level, voice_confidence, symptoms, notes')
        .eq('user_id', userId).gte('date', d28Str).order('date'),
      supabase.from('vocal_reports')
        .select('date, clarity_pct, notes')
        .eq('user_id', userId).order('date', { ascending: false }).limit(10),
      supabase.from('ritual_completions')
        .select('date, feeling_rating, difficulty_rating').eq('user_id', userId).gte('date', d35Str),
      supabase.from('habit_completions')
        .select('date, completed').eq('user_id', userId).gte('date', d28Str),
      supabase.from('profiles')
        .select('baseline_clarity_pct').eq('id', userId).maybeSingle(),
      supabase.from('weekly_checkins')
        .select('week_start, goal_id, goal_question_1, goal_question_2')
        .eq('user_id', userId).gte('week_start', d35Str),
    ]).then(([checkinsRes, reportsRes, ritualsRes, habitsRes, profileRes, weeklyCheckinsRes]) => {
      if (cancelled) return;

      const checkins: DailyCheckinRow[] = (checkinsRes.data ?? []).map(c => ({
        date: c.date,
        vocal_effort: c.vocal_effort,
        voice_demand_level: c.voice_demand_level,
        voice_confidence: c.voice_confidence,
        symptoms: c.symptoms ?? [],
        notes: c.notes ?? '',
      }));

      const output = computeGoalProgress(goal, {
        checkins,
        reports: (reportsRes.data ?? []).map(r => ({ date: r.date, clarityPct: r.clarity_pct, notes: r.notes ?? '' })),
        baselineClarityPct: profileRes.data?.baseline_clarity_pct ?? null,
        ritualCompletions: (ritualsRes.data ?? []).map(r => ({ date: r.date })),
        habitCompletions: (habitsRes.data ?? []).map(h => ({ date: h.date, completed: h.completed })),
        dailyRitualCount: Math.max(dailyRitualIds.length, 1),
        dailyHabitCount: Math.max(habitPairsCount, 1),
        weeklyCheckins: (weeklyCheckinsRes.data ?? []).map(w => ({
          weekStart: w.week_start,
          goalId: w.goal_id,
          goalQuestion1: w.goal_question_1,
          goalQuestion2: w.goal_question_2,
        })),
        ritualFeedback: (ritualsRes.data ?? []).map(r => ({
          date: r.date,
          feelingRating: r.feeling_rating,
          difficultyRating: r.difficulty_rating,
        })),
      });

      setResult(output);
      setLoading(false);

      const todayStr = today.toISOString().slice(0, 10);
      supabase.from('goal_progress_snapshots').upsert({
        user_id: userId,
        date: todayStr,
        goal,
        status: output.status,
        rule_version: GOAL_PROGRESS_RULE_VERSION,
        primary_value: output.primaryValue,
        primary_value_prior: output.priorValue,
        observations_count: output.observationsCount,
        safety_triggered: output.safetyTriggered,
        details: output.contributingFactors,
      }, { onConflict: 'user_id,date,goal' }).then(() => { });
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId, goal, dailyRitualIds.length, habitPairsCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const goalInfo = goal ? GOALS.find(g => g.id === goal) : null;
  const style = result ? STATUS_STYLES[result.status] : null;
  const TrendIcon = result?.status === 'IMPROVING' ? ArrowUp
    : result?.status === 'NEEDS_SUPPORT' ? ArrowDown
      : result?.status === 'GOAL_ACHIEVED' ? Trophy
        : Minus;

  return (
    <>
      <div
        className="bg-[#181b22]/90 backdrop-blur-[12px] border rounded-[28px] p-5 transition-all duration-300 shadow-sm relative overflow-hidden flex flex-col gap-4 group h-[132px]"
        id="goal-progress-card"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          borderColor: isHovering && style ? `${style.fill}30` : 'rgba(63,63,70,0.8)',
          background: isHovering && style ? `${style.fill}08` : 'rgba(24,27,34,0.9)',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[1.5px] transition-colors duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${style ? style.fill : '#17A9C9'}35, transparent)` }}
        />
        {style && (
          <div
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 rounded-full blur-[28px] pointer-events-none transition-all duration-500 group-hover:scale-105 z-0"
            style={{ background: `${style.fill}30` }}
          />
        )}

        <div className="flex items-start justify-between z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
              {goalInfo ? `${goalInfo.label}` : 'Goal Progress'}
            </span>
            <button
              onClick={() => setHelpOpen(true)}
              className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all duration-150 cursor-pointer flex-shrink-0"
              aria-label="How is this calculated?"
            >
              <span className="text-[9px] font-bold leading-none">?</span>
            </button>
          </div>

          {result && style && (
            <motion.div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: style.fill + '1a', border: `1px solid ${style.fill}40` }}
              animate={isHovering ? { y: [0, -1.5, 0], scale: 1.05 } : { y: 0, scale: 1 }}
              transition={isHovering
                ? { y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.2 } }
                : { duration: 0.2 }}
            >
              <TrendIcon className="w-4 h-4" style={{ color: style.fill }} strokeWidth={2.5} />
            </motion.div>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center z-10">
            <div className="w-5 h-5 border-2 border-[#17A9C9] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !goal ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-center z-10">
            <span className="text-[11px] text-zinc-500">Choose a focus goal to start tracking progress.</span>
          </div>
        ) : result && style ? (
          <div className="flex-1 flex flex-col justify-between z-10">
            <h3 className="text-[16px] font-semibold tracking-tight leading-none font-sans -mt-3 mb-1" style={{ color: style.fill, filter: `drop-shadow(0 0 4px ${style.fill}60)` }}>
              {style.label}
            </h3>
            <p className="text-[10.5px] text-zinc-500 leading-relaxed">
              {result.primaryValue != null && (
                <span className="font-mono text-zinc-300">{Math.round(result.primaryValue)}{unitFor(goal)} · </span>
              )}
              {STATUS_DESCRIPTIONS[result.status]}
            </p>
          </div>
        ) : null}
      </div>

      {helpOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setHelpOpen(false)}>
          <div
            className="relative max-w-sm w-full rounded-[28px] p-6 flex flex-col gap-4"
            style={{
              background: 'linear-gradient(to bottom, rgba(20,24,32,1) 0%, rgba(13,14,17,1) 100%)',
              border: '1px solid rgba(33,232,255,0.15)',
              boxShadow: '0 0 40px rgba(23,169,201,0.08), 0 20px 60px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[14px] font-semibold text-white tracking-tight">How Goal Progress Works</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Each status compares your last two weekly averages for your goal's primary measure. Status needs at least 3 check-ins in the last 7 days and 2 weeks of data to compute a trend — otherwise it shows More Data Needed. Concerning symptom patterns always override to Needs Support.
            </p>
            <button
              onClick={() => setHelpOpen(false)}
              className="w-full py-2.5 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
