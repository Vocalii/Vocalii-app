import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GOALS } from './onboarding/ScreenGoals';
import { TRAITS, TRAIT_COLORS } from './onboarding/ScreenVoiceTraits';
import { DAILY_HABITS, VOCAL_HABITS } from './onboarding/ScreenHabits';
import { Goal, HabitPair } from '../types/onboarding';

interface DayData {
  date: string;          // 'Mon', 'Tue', etc.
  fullDate: string;      // 'Jun 30'
  checkInDone: boolean;
  vocaEffort: number | null;      // 0–10
  vocalConfidence: number | null; // 0–10
  ritualsCompleted: number;
  totalRituals: number;
  symptoms: string[];
  supportArea: string | null;
  notes: string;
  pitchHz?: number;
  resonanceScore?: number;
  clarityPct?: number;
}

const WEEK_DATA: DayData[] = [
  {
    date: 'Mon', fullDate: 'Jun 23', checkInDone: true, vocaEffort: 3, vocalConfidence: 8, ritualsCompleted: 3, totalRituals: 3,
    symptoms: [], supportArea: 'Breath & Fatigue',
    notes: 'Great morning — voice felt clear and resonant. Humming exercises went smoothly.',
    pitchHz: 138, resonanceScore: 78, clarityPct: 82,
  },
  {
    date: 'Tue', fullDate: 'Jun 24', checkInDone: true, vocaEffort: 6, vocalConfidence: 4, ritualsCompleted: 2, totalRituals: 3,
    symptoms: ['Tension', 'Dryness', 'Fatigue'], supportArea: 'Body Tension',
    notes: 'Two hours of back-to-back presentations. Voice felt strained by the afternoon.',
    pitchHz: 124, resonanceScore: 54, clarityPct: 61,
  },
  {
    date: 'Wed', fullDate: 'Jun 25', checkInDone: true, vocaEffort: 4, vocalConfidence: 6, ritualsCompleted: 3, totalRituals: 3,
    symptoms: ['Dryness'], supportArea: null,
    notes: 'Mid-week calibration. Slight dryness resolved after warm fluids.',
    pitchHz: 142, resonanceScore: 67, clarityPct: 74,
  },
  {
    date: 'Thu', fullDate: 'Jun 26', checkInDone: false, vocaEffort: null, vocalConfidence: null, ritualsCompleted: 1, totalRituals: 3,
    symptoms: [], supportArea: null,
    notes: '',
    pitchHz: undefined, resonanceScore: undefined, clarityPct: undefined,
  },
  {
    date: 'Fri', fullDate: 'Jun 27', checkInDone: true, vocaEffort: 2, vocalConfidence: 9, ritualsCompleted: 3, totalRituals: 3,
    symptoms: [], supportArea: 'Confidence',
    notes: 'Best session of the week — voice felt powerful and grounded.',
    pitchHz: 145, resonanceScore: 84, clarityPct: 89,
  },
  {
    date: 'Sat', fullDate: 'Jun 28', checkInDone: true, vocaEffort: 5, vocalConfidence: 5, ritualsCompleted: 2, totalRituals: 3,
    symptoms: ['Fatigue'], supportArea: 'Recovery',
    notes: 'Weekend rest day. Some fatigue from the week. Focused on recovery.',
    pitchHz: 130, resonanceScore: 60, clarityPct: 68,
  },
  {
    date: 'Sun', fullDate: 'Jun 29', checkInDone: true, vocaEffort: 3, vocalConfidence: 7, ritualsCompleted: 3, totalRituals: 3,
    symptoms: [], supportArea: null,
    notes: 'Good end to the week. Voice feels ready for the week ahead.',
    pitchHz: 140, resonanceScore: 76, clarityPct: 80,
  },
];

interface HabitCompletion {
  date: string;
  daily_habit: string;
  vocal_habit: string;
  completed: boolean;
}

function computeWeekDates(): { iso: string; label: string }[] {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days: { iso: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ iso: d.toISOString().slice(0, 10), label: dayLabels[d.getDay()] });
  }
  return days;
}

const TOP_RITUALS = [
  { emoji: '🎵', name: 'Vocal Hum', category: 'Warm-up', days: [true, true, true, false, true, true, true] },
  { emoji: '🌬️', name: 'Deep Breathing', category: 'Breath', days: [true, true, false, false, true, true, false] },
  { emoji: '💋', name: 'Lip Trill', category: 'Articulation', days: [true, false, true, false, true, false, true] },
];

const GOAL_PROGRESS: { id: Goal; progress: number }[] = [
  { id: 'reduce_strain', progress: 72 },
  { id: 'build_endurance', progress: 45 },
  { id: 'sound_confident', progress: 88 },
];

const SELECTED_TRAIT = 'Confident';
const TRAIT_PROGRESS = 63; // % of the way to sounding like this trait

const TRAIT_RING_RADIUS = 54;
const TRAIT_RING_CIRCUMFERENCE = 2 * Math.PI * TRAIT_RING_RADIUS;

const EFFORT_COLOR = (n: number) =>
  n <= 3 ? '#21e8ff' : n <= 6 ? '#f59e0b' : '#ef4444';

function MetricCircle({ value, label, unit, color }: { value: string; label: string; unit?: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className="w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center"
        style={{
          background: `radial-gradient(circle at 38% 32%, ${color}20 0%, ${color}08 100%)`,
          border: `1px solid ${color}40`,
          boxShadow: `0 0 24px ${color}12`,
        }}
      >
        <div className="flex items-baseline gap-0.5">
          <span className="text-[22px] font-light tabular-nums" style={{ color }}>{value}</span>
          {unit && <span className="text-[10px]" style={{ color: `${color}80` }}>{unit}</span>}
        </div>
      </motion.div>
      <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase text-center">{label}</span>
    </div>
  );
}

interface WeeklyReportPageProps {
  onBack: () => void;
  habitPairs: HabitPair[];
  habitCompletions: HabitCompletion[];
}

export default function WeeklyReportPage({ onBack, habitPairs, habitCompletions }: WeeklyReportPageProps) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const weekDates = computeWeekDates();
  const realHabitRows = habitPairs.map(pair => {
    const daily = DAILY_HABITS.find(h => h.id === pair.daily);
    const vocal = VOCAL_HABITS.find(h => h.id === pair.vocal);
    return {
      dailyLabel: daily?.label ?? pair.daily,
      dailyEmoji: daily?.emoji ?? '🎯',
      vocalLabel: vocal?.label ?? pair.vocal,
      vocalEmoji: vocal?.emoji ?? '🎙️',
      days: weekDates.map(wd => habitCompletions.some(c =>
        c.date === wd.iso && c.daily_habit === pair.daily && c.vocal_habit === pair.vocal && c.completed
      )),
    };
  });

  const checkedInDays = WEEK_DATA.filter(d => d.checkInDone).length;
  const totalRituals = WEEK_DATA.reduce((s, d) => s + d.ritualsCompleted, 0);
  const maxRituals = WEEK_DATA.reduce((s, d) => s + d.totalRituals, 0);
  const avgConfidence = (() => {
    const days = WEEK_DATA.filter(d => d.vocalConfidence !== null);
    return days.length ? (days.reduce((s, d) => s + (d.vocalConfidence ?? 0), 0) / days.length).toFixed(1) : '—';
  })();
  const avgResonance = (() => {
    const days = WEEK_DATA.filter(d => d.resonanceScore !== undefined);
    return days.length ? Math.round(days.reduce((s, d) => s + (d.resonanceScore ?? 0), 0) / days.length) : null;
  })();

  const ritualPct = Math.round((totalRituals / maxRituals) * 100);
  const bestDay = WEEK_DATA.filter(d => d.vocalConfidence !== null).sort((a, b) => (b.vocalConfidence ?? 0) - (a.vocalConfidence ?? 0))[0] ?? null;
  const worstDay = WEEK_DATA.filter(d => d.vocalConfidence !== null).sort((a, b) => (a.vocalConfidence ?? 0) - (b.vocalConfidence ?? 0))[0] ?? null;

  const allSymptoms = WEEK_DATA.flatMap(d => d.symptoms);
  const symptomCounts: Record<string, number> = {};
  allSymptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] ?? 0) + 1; });
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);

  const supportAreaCounts: Record<string, number> = {};
  WEEK_DATA.forEach(d => { if (d.supportArea) supportAreaCounts[d.supportArea] = (supportAreaCounts[d.supportArea] ?? 0) + 1; });
  const topSupportArea = Object.entries(supportAreaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <div className="w-full pt-[88px] pb-10 select-none font-sans text-zinc-100">

      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Heading row — matches ReportsPage header style */}
        <div className="mb-8 mt-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105"
                style={{ background: 'rgba(23,169,201,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}
              >
                <ChevronLeft className="w-4 h-4 text-[#21e8ff]" />
              </button>
              <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-500">Back</span>
            </div>
            <h2 className="text-3xl font-light tracking-tight text-white mb-2">Weekly Report</h2>
            <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
              Your voice health summary for Jun 23 – Jun 29.
            </p>
          </div>

          <div className="flex items-center gap-3 md:mt-2 flex-shrink-0">
            <button className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-3 py-2 rounded-xl bg-[#181b22] border border-zinc-800/80 hover:border-zinc-700">
              <ArrowLeft className="w-3 h-3" />
              Prev week
            </button>
            <button className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-3 py-2 rounded-xl bg-[#181b22] border border-zinc-800/80 hover:border-zinc-700">
              Next week
              <ArrowRight className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-white border border-zinc-800/80 hover:border-[#17A9C9]/35 px-4 py-2 rounded-xl bg-[#181b22] hover:bg-[#1d212a] transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              <Download className="w-3.5 h-3.5 text-[#21e8ff]" />
              Export
            </button>
          </div>
        </div>

        {/* 7-day strip */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {WEEK_DATA.map(day => {
            const effort = day.vocaEffort;
            const color = effort !== null ? EFFORT_COLOR(effort) : 'rgba(255,255,255,0.1)';
            return (
              <div key={day.date} className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{day.date}</span>
                <motion.div
                  whileHover={{ scale: day.checkInDone ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  onClick={() => day.checkInDone && setSelectedDay(day)}
                  className={`w-[100px] h-[100px] rounded-full flex items-center justify-center border ${day.checkInDone ? 'cursor-pointer' : 'cursor-default'}`}
                  style={day.checkInDone ? {
                    background: `radial-gradient(circle at 38% 32%, ${color}20 0%, ${color}08 100%)`,
                    border: `1px solid ${color}40`,
                    boxShadow: `0 0 24px ${color}12`,
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  {day.checkInDone && effort !== null && (
                    <span className="text-[18px] font-mono font-light" style={{ color }}>{effort}</span>
                  )}
                  {!day.checkInDone && (
                    <span className="text-[10px] text-zinc-700">—</span>
                  )}
                </motion.div>
                <div className="flex gap-0.5">
                  {Array.from({ length: day.totalRituals }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: i < day.ritualsCompleted ? '#21e8ff' : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
                <span className="text-[8px] text-zinc-700">{day.fullDate.split(' ')[1]}</span>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-8 text-[9px] text-zinc-600">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#21e8ff]/20 border border-[#21e8ff]/40" />
            <span>Number = vocal effort</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#21e8ff]" />
            <span>Ritual completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
            <span>Missed</span>
          </div>
        </div>

        {/* Top rituals */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Top rituals</span>
          <div className="h-px flex-1 bg-zinc-800/60" />
          {TOP_RITUALS.map((ritual, i) => (
            <div
              key={ritual.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ background: 'rgba(19,22,28,0.8)', borderColor: 'rgba(39,39,42,0.7)' }}
            >
              <span className="text-[9px] font-mono text-zinc-600">{i + 1}</span>
              <span className="text-[11px] text-zinc-300">{ritual.name}</span>
            </div>
          ))}
        </div>

        {topSymptoms.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Top symptoms</span>
            <div className="h-px flex-1 bg-zinc-800/60" />
            {topSymptoms.slice(0, 3).map(([symptom], i) => (
              <div
                key={symptom}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                style={{ background: 'rgba(19,22,28,0.8)', borderColor: 'rgba(39,39,42,0.7)' }}
              >
                <span className="text-[9px] font-mono text-zinc-600">{i + 1}</span>
                <span className="text-[11px] text-zinc-300">{symptom}</span>
              </div>
            ))}
          </div>
        )}

        {topSupportArea && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Top support area</span>
            <div className="h-px flex-1 bg-zinc-800/60" />
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ background: 'rgba(19,22,28,0.8)', borderColor: 'rgba(39,39,42,0.7)' }}
            >
              <span className="text-[11px] text-zinc-300">{topSupportArea}</span>
            </div>
          </div>
        )}

        {/* AI Insight */}
        <div
          className="relative mb-8 overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(160deg, rgba(23,169,201,0.06) 0%, rgba(13,16,21,0.9) 60%)',
            border: '1px solid rgba(33,232,255,0.10)',
          }}
        >
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(23,169,201,0.08) 0%, transparent 60%)' }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.25), transparent)' }} />

          <div className="px-7 py-8 flex flex-col gap-8">
            <p className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.6)' }}>AI Insight</p>

            {/* Overview */}
            <div className="flex flex-col gap-2">
              <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Overview</p>
              <p className="text-[13px] font-light text-zinc-300 leading-relaxed">
                You checked in <span className="text-[#21e8ff]">{checkedInDays} out of 7 days</span> with an average confidence of{' '}
                <span className="text-[#a78bfa]">{avgConfidence}/10</span> and completed{' '}
                <span className="text-[#818cf8]">{ritualPct}% of your rituals</span>.
                {avgResonance !== null && <> Average resonance sat at <span className="text-[#10b981]">{avgResonance}</span> across recorded sessions.</>}
              </p>
            </div>

            {/* What improved */}
            <div className="flex flex-col gap-2">
              <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">What improved</p>
              <p className="text-[13px] font-light text-zinc-300 leading-relaxed">
                {bestDay
                  ? <><span className="text-emerald-400">{bestDay.date}</span> was your strongest day — confidence peaked at <span className="text-emerald-400">{bestDay.vocalConfidence}/10</span>{bestDay.resonanceScore !== undefined ? <> with a resonance score of <span className="text-emerald-400">{bestDay.resonanceScore}</span></> : ''}. </>
                  : ''}
                {topSupportArea === 'Confidence'
                  ? 'Confidence was a recurring focus area this week, suggesting meaningful engagement with vocal presence work.'
                  : 'Consistent ritual completion on your stronger days reinforced positive vocal patterns throughout the week.'}
              </p>
            </div>

            {/* What needs work + recovery */}
            <div className="flex flex-col gap-2">
              <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Needs attention · Recovery</p>
              <p className="text-[13px] font-light text-zinc-300 leading-relaxed">
                {worstDay
                  ? <><span className="text-amber-400">{worstDay.date}</span> showed the most strain — confidence dropped to <span className="text-amber-400">{worstDay.vocalConfidence}/10</span>{worstDay.symptoms.length > 0 ? <> with {worstDay.symptoms.join(', ').toLowerCase()} reported</> : ''}. </>
                  : ''}
                {topSymptoms.length > 0
                  ? <>Focus on hydration and vocal rest on high-demand days. <span className="text-amber-400">{topSymptoms[0][0]}</span> was your most frequent symptom — consider adding a cool-down ritual after extended voice use.</>
                  : 'Keep protecting recovery days with silence windows and warm fluids to maintain the upward trend.'}
              </p>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="flex justify-around mb-10">
          <MetricCircle value={String(checkedInDays)} label="Check-ins" unit={`/7`} color="#21e8ff" />
          <MetricCircle value={String(totalRituals)} label="Rituals done" unit={`/${maxRituals}`} color="#818cf8" />
          <MetricCircle value={String(avgConfidence)} label="Avg confidence" unit="/10" color="#a78bfa" />
          {avgResonance !== null && (
            <MetricCircle value={String(avgResonance)} label="Avg vocal effort" unit="%" color="#10b981" />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Goal progress */}
          <div
            className="rounded-[28px] p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(23,169,201,0.06) 0%, rgba(13,16,21,0.85) 60%)',
              border: '1px solid rgba(33,232,255,0.10)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.25), transparent)' }} />
            <h2 className="text-base font-light tracking-tight text-white mb-6 relative z-10">Progress toward your goals</h2>
            <div className="flex flex-col gap-5 relative z-10">
              {GOAL_PROGRESS.map(({ id, progress }) => {
                const goal = GOALS.find(g => g.id === id);
                if (!goal) return null;
                return (
                  <div key={id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{goal.emoji}</span>
                      <span className="text-sm font-light text-white">{goal.label}</span>
                      <span className="ml-auto text-[11px] font-mono tabular-nums text-[#21e8ff]">{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #17A9C9 0%, #21e8ff 100%)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voice trait */}
          {(() => {
            const trait = TRAITS.find(t => t.label === SELECTED_TRAIT);
            if (!trait) return null;
            const colors = TRAIT_COLORS[trait.label];
            const offset = TRAIT_RING_CIRCUMFERENCE * (1 - TRAIT_PROGRESS / 100);
            const gradientId = `traitRingGradient-${trait.label}`;
            return (
              <div
                className="rounded-[28px] p-6 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, rgba(23,169,201,0.06) 0%, rgba(13,16,21,0.85) 60%)',
                  border: '1px solid rgba(33,232,255,0.10)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.25), transparent)' }} />
                <h2 className="text-base font-light tracking-tight text-white mb-6 relative z-10">Sounding more {trait.label.toLowerCase()}</h2>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="relative w-[132px] h-[132px] flex-shrink-0">
                    <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
                      <circle cx="66" cy="66" r={TRAIT_RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <motion.circle
                        cx="66" cy="66" r={TRAIT_RING_RADIUS} fill="none" stroke={`url(#${gradientId})`}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={TRAIT_RING_CIRCUMFERENCE}
                        initial={{ strokeDashoffset: TRAIT_RING_CIRCUMFERENCE }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.5" />
                          <stop offset="100%" stopColor={colors.primary} />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <span className="text-2xl" style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}>{trait.emoji}</span>
                      <span className="text-[15px] font-light tabular-nums text-white">{TRAIT_PROGRESS}%</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-1.5">Your desired trait</p>
                    <p className="text-sm font-medium mb-2" style={{ color: colors.primary }}>{trait.label}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{trait.subtitle}</p>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Habits this week */}
        <div
          className="mb-6 rounded-[28px] p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(23,169,201,0.06) 0%, rgba(13,16,21,0.85) 60%)',
            border: '1px solid rgba(33,232,255,0.10)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.25), transparent)' }} />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(23,169,201,0.08) 0%, transparent 70%)', filter: 'blur(20px)' }} />
          <h2 className="text-base font-light tracking-tight text-white mb-6 relative z-10">Your habits this week</h2>
          {realHabitRows.length === 0 ? (
            <p className="text-[11px] text-zinc-600 text-center py-4 relative z-10">No habits set yet</p>
          ) : (
            <div className="flex flex-col gap-8 relative z-10">
              {realHabitRows.map((habit, i) => {
                const doneCount = habit.days.filter(Boolean).length;
                return (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">{habit.dailyEmoji}</span>
                      <span className="text-sm font-light text-white">{habit.dailyLabel}</span>
                      <span className="text-zinc-700 text-xs">→</span>
                      <span className="text-base">{habit.vocalEmoji}</span>
                      <span className="text-sm font-light text-white">{habit.vocalLabel}</span>
                      <span className="ml-auto text-[10px] font-mono tabular-nums text-zinc-300">{doneCount}/7</span>
                    </div>
                    <div className="flex gap-1.5 mt-5">
                      {weekDates.map((wd, di) => {
                        const done = habit.days[di];
                        return (
                          <div key={wd.iso} className="flex flex-col items-center gap-1.5 flex-1">
                            <div
                              className="w-9 h-9 rounded-full"
                              style={done ? {
                                background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.20) 0%, rgba(23,169,201,0.08) 100%)',
                                border: '1px solid rgba(33,232,255,0.40)',
                                boxShadow: '0 0 14px rgba(33,232,255,0.18)',
                              } : {
                                background: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.06)',
                              }}
                            />
                            <span className="text-[8px] font-mono text-zinc-600">{wd.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-[12px] text-zinc-700 text-center leading-relaxed mt-12 px-6">
          Vocalii provides educational, wellness, and performance support. It does not diagnose or treat voice disorders. If you experience persistent hoarseness, pain, voice loss, swallowing difficulty, or other concerning symptoms, consult an ENT, SLP, or medical professional.
        </p>

      </div>

      {/* Day detail modal */}
      <AnimatePresence>
        {selectedDay && (() => {
          const day = selectedDay;
          const effort = day.vocaEffort;
          const color = effort !== null ? EFFORT_COLOR(effort) : '#52525b';
          return (
            <motion.div
              key="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
              onClick={() => setSelectedDay(null)}
            >
              <motion.div
                key="modal-card"
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="relative w-full max-w-md rounded-[28px] p-7 flex flex-col gap-5 overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, ${color}0d 0%, #13161c 40%, #0f1115 100%)`,
                  border: `1px solid ${color}35`,
                  boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${color}18, inset 0 1px 0 ${color}20`,
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Ambient glow blob */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${color}0c 0%, transparent 70%)`, filter: 'blur(32px)' }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${color}0e 0%, transparent 70%)`, filter: 'blur(20px)' }} />
                {/* Top highlight line */}
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />

                {/* Close */}
                <button
                  onClick={() => setSelectedDay(null)}
                  className="absolute top-5 right-5 w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {/* Header */}
                <div className="pr-8">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-0.5">{day.fullDate}</p>
                  <h3 className="text-2xl font-light text-white mb-4">{day.date}</h3>
                  <div className="flex gap-6">
                    {effort !== null && (
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 block mb-1">Vocal fatigue</span>
                        <span className="text-[22px] font-light font-mono" style={{ color }}>{effort}<span className="text-[12px] text-zinc-600">/10</span></span>
                      </div>
                    )}
                    {day.resonanceScore !== undefined && (
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 block mb-1">Vocal effort</span>
                        <span className="text-[22px] font-light font-mono text-[#10b981]">{day.resonanceScore}<span className="text-[12px] text-zinc-600">%</span></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ritual dots */}
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Rituals</span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: day.totalRituals }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full"
                        style={{ background: i < day.ritualsCompleted ? '#21e8ff' : 'rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{day.ritualsCompleted}/{day.totalRituals}</span>
                </div>

                {/* Symptoms + support area */}
                {(day.symptoms.length > 0 || day.supportArea) && (
                  <div className="flex gap-6">
                    {day.symptoms.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 block mb-2">Symptoms</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {day.symptoms.map(s => (
                            <span key={s} className="text-[10px] px-2.5 py-1 rounded-full border border-amber-500/25 text-amber-400/80 bg-amber-500/05">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {day.supportArea && (
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 block mb-2">Support area</span>
                        <span className="text-[10px] px-2.5 py-1 rounded-full border border-[#17A9C9]/25 text-[#21e8ff]/70 bg-[#17A9C9]/05">{day.supportArea}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {day.notes && (
                  <div className="pt-1 border-t border-zinc-800/60">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 block mb-2">Notes</span>
                    <p className="text-[12px] text-zinc-400 leading-relaxed">{day.notes}</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
