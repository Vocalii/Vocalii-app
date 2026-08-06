import { useEffect, useState, Fragment } from 'react';
import { ArrowLeft, ChevronLeft, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TRAITS } from './onboarding/ScreenVoiceTraits';
import { DAILY_HABITS, VOCAL_HABITS } from './onboarding/ScreenHabits';
import { Goal, HabitPair } from '../types/onboarding';
import { supabase } from '../lib/supabase';
import GoalProgressCard from './GoalProgressCard';
import TraitAlignmentGlow, { computeTraitScore, getFeelingStatement, getGlowTier, getTraitGlowColor } from './TraitAlignmentGlow';
import { EXERCISE_RITUALS } from '../ritualsData';

interface DayData {
  date: string;          // 'Mon', 'Tue', etc.
  fullDate: string;      // 'Jun 30'
  checkInDone: boolean;
  vocaEffort: number | null;      // 0–10
  vocalConfidence: number | null; // 1–5
  voiceDemandLevel: number | null; // 1–5
  ritualsCompleted: number;
  totalRituals: number;
  symptoms: string[];
  supportArea: string | null;
  notes: string;
  pitchHz?: number;
  resonanceScore?: number;
  clarityPct?: number;
}

interface HabitCompletion {
  date: string;
  daily_habit: string;
  vocal_habit: string;
  completed: boolean;
}

// Always the Monday-Sunday calendar week containing today — not a rolling last-7-days window —
// matching the Monday-bucketing convention already used in goalProgress.ts/weeklyCheckin.ts.
function computeWeekDates(): { iso: string; label: string }[] {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const days: { iso: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ iso: d.toISOString().slice(0, 10), label: dayLabels[d.getDay()] });
  }
  return days;
}

const EFFORT_COLOR = (n: number) =>
  n <= 3 ? '#21e8ff' : n <= 6 ? '#f59e0b' : '#ef4444';

// Composite "how strained was this day" score (1-10, higher = worse) folding in effort, confidence,
// and demand together, rather than coloring the day-detail modal off vocal_effort alone. Each
// available signal is normalized onto the same 1-10/higher-is-worse scale before averaging, so a
// day is only missing a term if that field wasn't captured (e.g. no check-in yet that day).
function dayStrainScore(day: Pick<DayData, 'vocaEffort' | 'vocalConfidence' | 'voiceDemandLevel'>): number | null {
  const terms: number[] = [];
  if (day.vocaEffort != null) terms.push(day.vocaEffort); // already 1-10, higher = worse
  if (day.vocalConfidence != null) terms.push((6 - day.vocalConfidence) * 2); // 1-5 higher=better -> 1-10 higher=worse
  if (day.voiceDemandLevel != null) terms.push(day.voiceDemandLevel * 2); // 1-5 -> 1-10, higher demand weighs toward more strain
  if (terms.length === 0) return null;
  return terms.reduce((a, b) => a + b, 0) / terms.length;
}

// Smooth violet-to-red gradient for the "Avg vocal effort" metric tile (1-10 scale), so it reads
// distinctly from the confidence tile's fixed violet rather than just matching it at low values.
// Endpoints match VoiceHealthStatus.tsx's Steady (violet) / Needs Support (red) palette.
const EFFORT_VIOLET_RED_COLOR = (n: number) => {
  const t = Math.max(0, Math.min(1, (n - 1) / 9));
  const from = { r: 167, g: 139, b: 250 }; // #a78bfa
  const to = { r: 248, g: 113, b: 113 };   // #f87171
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  const r = toHex(from.r + (to.r - from.r) * t);
  const g = toHex(from.g + (to.g - from.g) * t);
  const b = toHex(from.b + (to.b - from.b) * t);
  return `#${r}${g}${b}`;
};

// Same {{main}}/**secondary** markup convention as HeroSection.tsx's parseTraitDescription —
// duplicated locally per this codebase's precedent of duplicating small self-contained parsers
// rather than sharing a util across unrelated components.
type StatementSegment = { text: string; type: 'plain' | 'main' | 'secondary' };

function parseTraitStatement(statement: string): StatementSegment[] {
  const regex = /\{\{(.+?)\}\}|\*\*(.+?)\*\*/g;
  const segments: StatementSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(statement)) !== null) {
    if (match.index > lastIndex) segments.push({ text: statement.slice(lastIndex, match.index), type: 'plain' });
    segments.push(match[1] !== undefined ? { text: match[1], type: 'main' } : { text: match[2], type: 'secondary' });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < statement.length) segments.push({ text: statement.slice(lastIndex), type: 'plain' });
  return segments;
}

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
  userId: string | null;
  goal: Goal | null;
  dailyRitualIds: string[];
  onResetWeeklyCheckIn?: () => void;
}

export default function WeeklyReportPage({ onBack, habitPairs, habitCompletions, userId, goal, dailyRitualIds, onResetWeeklyCheckIn }: WeeklyReportPageProps) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [traitCheckin, setTraitCheckin] = useState<{ trait: string; traitQuestion1: number | null; traitQuestion2: number | null } | null | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      setTraitCheckin(null);
      return;
    }
    let cancelled = false;
    supabase.from('weekly_checkins')
      .select('trait, trait_question_1, trait_question_2')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTraitCheckin(data ? { trait: data.trait, traitQuestion1: data.trait_question_1, traitQuestion2: data.trait_question_2 } : null);
      });
    return () => { cancelled = true; };
  }, [userId]);

  interface WeekCheckinInfo { vocalEffort: number; voiceConfidence: number | null; voiceDemandLevel: number | null; symptoms: string[]; supportArea: string | null; notes: string; selectedRitualIds: string[] }
  interface WeekReportInfo { resonanceScore?: number; clarityPct?: number; pitchHz?: number }
  const [weekRaw, setWeekRaw] = useState<{
    checkins: Record<string, WeekCheckinInfo>;
    ritualCountByDate: Record<string, number>;
    ritualCountByRitualId: Record<string, number>;
    reportsByDate: Record<string, WeekReportInfo>;
  } | null>(null);
  const [aiWeeklyInsight, setAiWeeklyInsight] = useState<{ overview: string; whatImproved: string; needsAttention: string } | null>(null);

  useEffect(() => {
    const dates = computeWeekDates();
    const startDate = dates[0].iso;
    const endDate = dates[dates.length - 1].iso;

    if (!userId) {
      setWeekRaw({ checkins: {}, ritualCountByDate: {}, ritualCountByRitualId: {}, reportsByDate: {} });
      return;
    }

    let cancelled = false;
    Promise.all([
      supabase.from('daily_checkins')
        .select('date, vocal_effort, voice_confidence, voice_demand_level, symptoms, support_area, notes, selected_ritual_ids')
        .eq('user_id', userId).gte('date', startDate).lte('date', endDate),
      supabase.from('ritual_completions')
        .select('date, ritual_id')
        .eq('user_id', userId).gte('date', startDate).lte('date', endDate),
      supabase.from('vocal_reports')
        .select('date, resonance_score, clarity_pct, pitch_hz')
        .eq('user_id', userId).gte('date', startDate).lte('date', endDate),
    ]).then(([checkinsRes, ritualsRes, reportsRes]) => {
      if (cancelled) return;

      const checkins: Record<string, WeekCheckinInfo> = {};
      (checkinsRes.data ?? []).forEach(c => {
        checkins[c.date] = {
          vocalEffort: c.vocal_effort,
          voiceConfidence: c.voice_confidence,
          voiceDemandLevel: c.voice_demand_level,
          symptoms: c.symptoms ?? [],
          supportArea: c.support_area || null,
          notes: c.notes ?? '',
          selectedRitualIds: c.selected_ritual_ids ?? [],
        };
      });

      const ritualCountByDate: Record<string, number> = {};
      const ritualCountByRitualId: Record<string, number> = {};
      (ritualsRes.data ?? []).forEach(r => {
        ritualCountByDate[r.date] = (ritualCountByDate[r.date] ?? 0) + 1;
        ritualCountByRitualId[r.ritual_id] = (ritualCountByRitualId[r.ritual_id] ?? 0) + 1;
      });

      const reportValuesByDate: Record<string, { resonance: number[]; clarity: number[]; pitch: number[] }> = {};
      (reportsRes.data ?? []).forEach(r => {
        const bucket = reportValuesByDate[r.date] ?? (reportValuesByDate[r.date] = { resonance: [], clarity: [], pitch: [] });
        if (r.resonance_score != null) bucket.resonance.push(r.resonance_score);
        if (r.clarity_pct != null) bucket.clarity.push(r.clarity_pct);
        if (r.pitch_hz != null) bucket.pitch.push(r.pitch_hz);
      });
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;
      const reportsByDate: Record<string, WeekReportInfo> = {};
      Object.entries(reportValuesByDate).forEach(([date, v]) => {
        reportsByDate[date] = { resonanceScore: avg(v.resonance), clarityPct: avg(v.clarity), pitchHz: avg(v.pitch) };
      });

      setWeekRaw({ checkins, ritualCountByDate, ritualCountByRitualId, reportsByDate });
    });

    return () => { cancelled = true; };
  }, [userId]);

  const weekDates = computeWeekDates();
  const formatShortDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const weekData: DayData[] = weekDates.map(wd => {
    const checkin = weekRaw?.checkins[wd.iso];
    const report = weekRaw?.reportsByDate[wd.iso];
    return {
      date: wd.label,
      fullDate: formatShortDate(wd.iso),
      checkInDone: checkin != null,
      vocaEffort: checkin?.vocalEffort ?? null,
      vocalConfidence: checkin?.voiceConfidence ?? null,
      voiceDemandLevel: checkin?.voiceDemandLevel ?? null,
      ritualsCompleted: weekRaw?.ritualCountByDate[wd.iso] ?? 0,
      totalRituals: checkin?.selectedRitualIds.length ?? 0,
      symptoms: checkin?.symptoms ?? [],
      supportArea: checkin?.supportArea ?? null,
      notes: checkin?.notes ?? '',
      resonanceScore: report?.resonanceScore,
      clarityPct: report?.clarityPct,
      pitchHz: report?.pitchHz,
    };
  });

  const topRituals = weekRaw
    ? Object.entries(weekRaw.ritualCountByRitualId)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([ritualId]) => ({ name: EXERCISE_RITUALS.find(r => r.id === ritualId)?.name ?? ritualId }))
    : [];

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

  const checkedInDays = weekData.filter(d => d.checkInDone).length;
  const totalRituals = weekData.reduce((s, d) => s + d.ritualsCompleted, 0);
  const maxRituals = weekData.reduce((s, d) => s + d.totalRituals, 0);
  const avgConfidence = (() => {
    const days = weekData.filter(d => d.vocalConfidence !== null);
    return days.length ? (days.reduce((s, d) => s + (d.vocalConfidence ?? 0), 0) / days.length).toFixed(1) : '—';
  })();
  const avgEffort = (() => {
    const days = weekData.filter(d => d.vocaEffort !== null);
    return days.length ? (days.reduce((s, d) => s + (d.vocaEffort ?? 0), 0) / days.length).toFixed(1) : '—';
  })();
  const avgResonance = (() => {
    const days = weekData.filter(d => d.resonanceScore !== undefined);
    return days.length ? Math.round(days.reduce((s, d) => s + (d.resonanceScore ?? 0), 0) / days.length) : null;
  })();

  const ritualPct = maxRituals > 0 ? Math.round((totalRituals / maxRituals) * 100) : 0;
  const bestDay = weekData.filter(d => d.vocalConfidence !== null).sort((a, b) => (b.vocalConfidence ?? 0) - (a.vocalConfidence ?? 0))[0] ?? null;
  const worstDay = weekData.filter(d => d.vocalConfidence !== null).sort((a, b) => (a.vocalConfidence ?? 0) - (b.vocalConfidence ?? 0))[0] ?? null;

  const allSymptoms = weekData.flatMap(d => d.symptoms);
  const symptomCounts: Record<string, number> = {};
  allSymptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] ?? 0) + 1; });
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);

  const supportAreaCounts: Record<string, number> = {};
  weekData.forEach(d => { if (d.supportArea) supportAreaCounts[d.supportArea] = (supportAreaCounts[d.supportArea] ?? 0) + 1; });
  const topSupportArea = Object.entries(supportAreaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  useEffect(() => {
    if (!weekRaw) return;
    setAiWeeklyInsight(null);
    let cancelled = false;
    const weekStart = weekDates[0].iso;

    const generateAndStore = () => {
      fetch('/api/weekly-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkedInDays,
          avgConfidence,
          avgEffort,
          avgResonance,
          ritualPct,
          bestDay: bestDay ? { date: bestDay.date, vocalConfidence: bestDay.vocalConfidence, resonanceScore: bestDay.resonanceScore } : null,
          worstDay: worstDay ? { date: worstDay.date, vocalConfidence: worstDay.vocalConfidence, symptoms: worstDay.symptoms } : null,
          topSymptoms,
          topSupportArea,
        }),
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (cancelled || !data) return;
          if (typeof data.overview === 'string' && typeof data.whatImproved === 'string' && typeof data.needsAttention === 'string') {
            setAiWeeklyInsight(data);
            if (userId) {
              supabase.from('weekly_report_insights').upsert({
                user_id: userId,
                week_start: weekStart,
                overview: data.overview,
                what_improved: data.whatImproved,
                needs_attention: data.needsAttention,
              }, { onConflict: 'user_id,week_start' }).then(() => { });
            }
          }
        })
        .catch(() => {});
    };

    // Generated once per (user, week) and cached — reused on every later visit this week instead
    // of calling Claude again, so the report stays static rather than regenerating each view.
    if (!userId) {
      generateAndStore();
      return;
    }
    supabase.from('weekly_report_insights')
      .select('overview, what_improved, needs_attention')
      .eq('user_id', userId).eq('week_start', weekStart).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setAiWeeklyInsight({ overview: data.overview, whatImproved: data.what_improved, needsAttention: data.needs_attention });
        } else {
          generateAndStore();
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekRaw, userId]);

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
              {onResetWeeklyCheckIn && (
                <button
                  onClick={onResetWeeklyCheckIn}
                  className="ml-2 text-[9px] font-mono tracking-widest uppercase text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                  title="Dev/testing only — clears this week's check-in so you can complete it again"
                >
                  Reset check-in (dev)
                </button>
              )}
            </div>
            <h2 className="text-3xl font-light tracking-tight text-white mb-2">Weekly Report</h2>
            <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
              Your voice health summary for {formatShortDate(weekDates[0].iso)} – {formatShortDate(weekDates[weekDates.length - 1].iso)}.
            </p>
          </div>

          <div className="flex items-center gap-3 md:mt-2 flex-shrink-0">
            <button className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-3 py-2 rounded-xl bg-[#181b22] border border-zinc-800/80 hover:border-zinc-700">
              <ArrowLeft className="w-3 h-3" />
              Prev week
            </button>
            <button className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-white border border-zinc-800/80 hover:border-[#17A9C9]/35 px-4 py-2 rounded-xl bg-[#181b22] hover:bg-[#1d212a] transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              <Download className="w-3.5 h-3.5 text-[#21e8ff]" />
              Export
            </button>
          </div>
        </div>

        {/* 7-day strip */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {weekData.map(day => {
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
        {topRituals.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Top rituals</span>
          <div className="h-px flex-1 bg-zinc-800/60" />
          {topRituals.map((ritual, i) => (
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
        )}

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
                {aiWeeklyInsight ? aiWeeklyInsight.overview : (
                  <>
                    You checked in <span className="text-[#21e8ff]">{checkedInDays} out of 7 days</span> with an average confidence of{' '}
                    <span className="text-[#a78bfa]">{avgConfidence}/5</span> and completed{' '}
                    <span className="text-[#818cf8]">{ritualPct}% of your rituals</span>.
                    {avgResonance !== null && <> Average resonance sat at <span className="text-[#10b981]">{avgResonance}</span> across recorded sessions.</>}
                  </>
                )}
              </p>
            </div>

            {/* What improved */}
            <div className="flex flex-col gap-2">
              <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">What improved</p>
              <p className="text-[13px] font-light text-zinc-300 leading-relaxed">
                {aiWeeklyInsight ? aiWeeklyInsight.whatImproved : (
                  <>
                    {bestDay
                      ? <><span className="text-emerald-400">{bestDay.date}</span> was your strongest day — confidence peaked at <span className="text-emerald-400">{bestDay.vocalConfidence}/5</span>{bestDay.resonanceScore !== undefined ? <> with a resonance score of <span className="text-emerald-400">{Math.round(bestDay.resonanceScore)}</span></> : ''}. </>
                      : ''}
                    {topSupportArea === 'Confidence'
                      ? 'Confidence was a recurring focus area this week, suggesting meaningful engagement with vocal presence work.'
                      : 'Consistent ritual completion on your stronger days reinforced positive vocal patterns throughout the week.'}
                  </>
                )}
              </p>
            </div>

            {/* What needs work + recovery */}
            <div className="flex flex-col gap-2">
              <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Needs attention · Recovery</p>
              <p className="text-[13px] font-light text-zinc-300 leading-relaxed">
                {aiWeeklyInsight ? aiWeeklyInsight.needsAttention : (
                  <>
                    {worstDay
                      ? <><span className="text-amber-400">{worstDay.date}</span> showed the most strain — confidence dropped to <span className="text-amber-400">{worstDay.vocalConfidence}/5</span>{worstDay.symptoms.length > 0 ? <> with {worstDay.symptoms.join(', ').toLowerCase()} reported</> : ''}. </>
                      : ''}
                    {topSymptoms.length > 0
                      ? <>Focus on hydration and vocal rest on high-demand days. <span className="text-amber-400">{topSymptoms[0][0]}</span> was your most frequent symptom — consider adding a cool-down ritual after extended voice use.</>
                      : 'Keep protecting recovery days with silence windows and warm fluids to maintain the upward trend.'}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="flex justify-around mb-10">
          <MetricCircle value={String(checkedInDays)} label="Check-ins" unit={`/7`} color="#21e8ff" />
          <MetricCircle value={String(totalRituals)} label="Rituals done" unit={`/${maxRituals}`} color="#818cf8" />
          <MetricCircle value={String(avgEffort)} label="Avg vocal effort" unit="/10" color={avgEffort !== '—' ? EFFORT_VIOLET_RED_COLOR(Number(avgEffort)) : '#818cf8'} />
          <MetricCircle value={String(avgConfidence)} label="Avg confidence" unit="/5" color="#a78bfa" />
          {avgResonance !== null && (
            <MetricCircle value={String(avgResonance)} label="Avg resonance" unit="%" color="#10b981" />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Goal progress */}
          <GoalProgressCard
            userId={userId}
            goal={goal}
            dailyRitualIds={dailyRitualIds}
            habitPairsCount={habitPairs.length}
          />

          {/* Voice trait */}
          {(() => {
            const KNOWN_TRAITS = ['Confident', 'Calm', 'Clear', 'Warm', 'Engaging'] as const;
            const traitLabel = traitCheckin?.trait;
            const trait = traitLabel ? TRAITS.find(t => t.label === traitLabel) : undefined;
            const hasScore = traitCheckin != null && traitCheckin.traitQuestion1 != null && traitCheckin.traitQuestion2 != null
              && (KNOWN_TRAITS as readonly string[]).includes(traitCheckin.trait);

            if (!trait || !hasScore || !traitCheckin) {
              return (
                <div
                  className="rounded-[28px] p-5 relative overflow-hidden flex flex-col items-center justify-center text-center gap-2 h-[132px]"
                  style={{
                    background: 'linear-gradient(145deg, rgba(23,169,201,0.06) 0%, rgba(13,16,21,0.85) 60%)',
                    border: '1px solid rgba(33,232,255,0.10)',
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.25), transparent)' }} />
                  <p className="text-sm text-zinc-500 relative z-10">Complete a weekly check-in to see this</p>
                </div>
              );
            }

            const score = computeTraitScore(traitCheckin.traitQuestion1 as number, traitCheckin.traitQuestion2 as number);
            const feelingStatement = getFeelingStatement(trait.label, score);
            const GLOW_NATIVE_SIZE = 260;
            const GLOW_DISPLAY_SIZE = 112;
            const EMOJI_REFERENCE_DISPLAY_SIZE = 66; // emoji stays the size it was at this display size
            const glowScale = GLOW_DISPLAY_SIZE / GLOW_NATIVE_SIZE;
            const emojiCounterScale = EMOJI_REFERENCE_DISPLAY_SIZE / GLOW_DISPLAY_SIZE;
            const traitLabelTyped = trait.label as typeof KNOWN_TRAITS[number];
            const tier = getGlowTier(score);
            const accentColor = getTraitGlowColor(traitLabelTyped);
            // Whole-card theming intensity follows the same tier as the glow itself — a low week
            // stays near-neutral, a high week tints the border/ambient bloom/hairline with the
            // trait's color — so the card doesn't just contain a bigger glow, it reads differently.
            const cardIntensity = tier.opacity;

            return (
              <div
                className="rounded-[28px] p-5 relative overflow-hidden flex flex-col h-[132px] group"
                style={{
                  background: `linear-gradient(145deg, ${accentColor}${Math.round(cardIntensity * 45).toString(16).padStart(2, '0')} 0%, rgba(13,16,21,0.85) 65%)`,
                  border: `1px solid ${accentColor}${Math.round((0.1 + cardIntensity * 0.4) * 255).toString(16).padStart(2, '0')}`,
                  boxShadow: `0 0 ${18 + cardIntensity * 34}px ${accentColor}${Math.round(cardIntensity * 55).toString(16).padStart(2, '0')}`,
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${accentColor}${Math.round((0.15 + cardIntensity * 0.35) * 255).toString(16).padStart(2, '0')}, transparent)` }}
                />
                <div
                  className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full pointer-events-none z-0"
                  style={{ filter: 'blur(28px)', background: `${accentColor}${Math.round(cardIntensity * 32).toString(16).padStart(2, '0')}` }}
                />
                {/* Shine sweep — only for the highest score tier */}
                {score > 8 && (
                  <motion.div
                    className="absolute inset-0 w-1/3 pointer-events-none z-0"
                    style={{
                      background: `linear-gradient(100deg, transparent, ${accentColor}12, transparent)`,
                    }}
                    animate={{ x: ['-120%', '320%'] }}
                    transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 8, ease: 'easeInOut' }}
                  />
                )}
                <div className="flex items-center relative z-10 flex-1 min-h-0 -ml-3">
                  <div style={{ width: GLOW_DISPLAY_SIZE, height: GLOW_DISPLAY_SIZE, flexShrink: 0, overflow: 'hidden' }}>
                    <div style={{ width: GLOW_NATIVE_SIZE, height: GLOW_NATIVE_SIZE, transform: `scale(${glowScale})`, transformOrigin: 'top left' }}>
                      <TraitAlignmentGlow trait={traitLabelTyped} score={score} emojiCounterScale={emojiCounterScale} />
                    </div>
                  </div>
                  <div className="min-w-0 -ml-1">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-1">Your desired trait</p>
                    <p className="text-sm font-medium mb-1 text-white">{trait.label}</p>
                    <p className="text-xs text-zinc-500 leading-snug">
                      {parseTraitStatement(feelingStatement).map((segment, i) => {
                        if (segment.type === 'main') {
                          return (
                            <span
                              key={i}
                              className="font-bold"
                              style={{ color: `color-mix(in srgb, ${accentColor} 85%, #a1a1aa)`, textShadow: `0 0 5px ${accentColor}70, 0 0 9px ${accentColor}38` }}
                            >
                              {segment.text}
                            </span>
                          );
                        }
                        if (segment.type === 'secondary') {
                          return (
                            <span
                              key={i}
                              className="font-semibold"
                              style={{ color: `color-mix(in srgb, ${accentColor} 55%, #a1a1aa)`, textShadow: `0 0 5px ${accentColor}38` }}
                            >
                              {segment.text}
                            </span>
                          );
                        }
                        return <Fragment key={i}>{segment.text}</Fragment>;
                      })}
                    </p>
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
          const strainScore = dayStrainScore(day);
          const color = strainScore !== null ? EFFORT_COLOR(strainScore) : '#52525b';
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
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 block mb-1">Vocal effort</span>
                        <span className="text-[22px] font-light font-mono" style={{ color }}>{effort}<span className="text-[12px] text-zinc-600">/10</span></span>
                      </div>
                    )}
                    {day.vocalConfidence !== null && (
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 block mb-1">Confidence</span>
                        <span className="text-[22px] font-light font-mono text-[#a78bfa]">{day.vocalConfidence}<span className="text-[12px] text-zinc-600">/5</span></span>
                      </div>
                    )}
                    {day.voiceDemandLevel !== null && (
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 block mb-1">Demand</span>
                        <span className="text-[22px] font-light font-mono text-[#f59e0b]">{day.voiceDemandLevel}<span className="text-[12px] text-zinc-600">/5</span></span>
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
