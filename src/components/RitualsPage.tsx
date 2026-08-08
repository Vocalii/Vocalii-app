import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  ChevronLeft,
  Sparkles,
  Clock,
  Flame,
  Compass,
  HeartCrack,
  Droplet,
  ArrowRight,
  Activity,
  X,
  Check,
  Wind,
  Anchor,
  Feather,
  AudioWaveform,
  Hammer,
  AlertTriangle,
  Shuffle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { EXERCISE_RITUALS } from '../ritualsData';
import { Ritual } from '../types';
import { HabitPair } from '../types/onboarding';
import { VOCAL_HABITS } from '../habitsData';

const DEFAULT_HABIT_PAIRS: HabitPair[] = [
  { daily: 'morning_shower', vocal: 'drink_water' },
  { daily: 'morning_coffee', vocal: 'vocal_hum' },
  { daily: 'bedtime_routine', vocal: 'silent_rest' },
];

const CATEGORY_PILL_STYLES: Record<string, string> = {
  Ground: 'bg-amber-500/25 border-amber-500/50',
  Breathe: 'bg-cyan-500/25 border-cyan-500/50',
  'Warm Up': 'bg-orange-500/25 border-orange-500/50',
  Release: 'bg-emerald-500/25 border-emerald-500/50',
  Resonate: 'bg-fuchsia-500/25 border-fuchsia-500/50',
  Build: 'bg-rose-500/25 border-rose-500/50',
};

export interface HabitCheckEntry {
  daily: string;
  vocal: string;
  completed: boolean;
}

function RitualFeedbackSlider({ label, value, onChange, accent }: { label: string; value: number; onChange: (n: number) => void; accent: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] text-zinc-300">{label}</p>
        <span className="text-[11px] font-mono flex-shrink-0 ml-3" style={{ color: accent }}>{value} / 10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab"
        style={{
          background: `linear-gradient(to right, ${accent}60 0%, ${accent} ${value / 10 * 100}%, rgba(255,255,255,0.14) ${value / 10 * 100}%, rgba(255,255,255,0.14) 100%)`,
          filter: `drop-shadow(0 0 ${2 + (value / 10) * 6}px ${accent}${Math.round((0.15 + (value / 10) * 0.45) * 255).toString(16).padStart(2, '0')})`,
        }}
      />
    </div>
  );
}

interface RitualsPageProps {
  dailyRitualIds: string[];
  activePrepEvent?: { title: string; daysLeft: number; aiInsight: string | null } | null;
  completedRitualIds: string[];
  onCompleteRitual: (id: string, feelingRating: number | null, difficultyRating: number | null) => void;
  onRestartRoutine: () => void;
  checkInDone: boolean;
  ritualsLoading?: boolean;
  ritualInsight?: string | null;
  habitPairs: HabitPair[];
  onCompleteCheckIn: (vocalEffort: number, confidence: number, symptoms: string[], habitChecks: HabitCheckEntry[], demandLevel: number, notes: string, supportArea: string) => void;
  onResetCheckIn?: () => void;
  onSwapRitual?: (oldRitualId: string, newRitualId: string) => void;
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
}

// The only ritual requiring equipment (a straw) — if it's in today's assigned routine, offer a
// one-tap swap to another ritual instead of blocking someone who doesn't have one on hand.
const STRAW_RITUAL_ID = 'straw-phonation-hierarchy';

export default function RitualsPage({ dailyRitualIds, activePrepEvent, completedRitualIds, onCompleteRitual, onRestartRoutine, checkInDone, ritualsLoading, ritualInsight, habitPairs, onCompleteCheckIn, onResetCheckIn, onSwapRitual, autoStart, onAutoStartConsumed }: RitualsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [isRitualActive, setIsRitualActive] = useState(false);
  const [ritualStarted, setRitualStarted] = useState(false);
  const [ritualCompleted, setRitualCompleted] = useState(false);
  const [fromRoutine, setFromRoutine] = useState(false);
  const [showRoutineComplete, setShowRoutineComplete] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInConfidence, setCheckInConfidence] = useState(3);
  const [checkInSymptoms, setCheckInSymptoms] = useState<string[]>([]);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInVocalEffort, setCheckInVocalEffort] = useState(5);
  const [checkInDemandLevel, setCheckInDemandLevel] = useState(3);
  const [checkInSupportArea, setCheckInSupportArea] = useState<string | null>(null);
  const [checkInStep, setCheckInStep] = useState<1 | 2 | 3>(1);
  const [habitChecks, setHabitChecks] = useState<Record<string, boolean | null>>({});
  const [ritualFeedbackId, setRitualFeedbackId] = useState<string | null>(null);
  const [ritualFeelingRating, setRitualFeelingRating] = useState(5);
  const [ritualDifficultyRating, setRitualDifficultyRating] = useState(5);

  // Check-in modal reuses the prep-mode blue when a prep event is active, teal otherwise
  const modalAccentRGB = activePrepEvent ? '59,130,246' : '23,169,201';
  const modalAccentBrightRGB = activePrepEvent ? '96,165,250' : '33,232,255';
  const modalAccentHex = activePrepEvent ? '#3b82f6' : '#17A9C9';
  const modalAccentBrightHex = activePrepEvent ? '#60a5fa' : '#21e8ff';

  const activeHabitPairs = habitPairs.length > 0 ? habitPairs : DEFAULT_HABIT_PAIRS;

  const CHECK_IN_HABITS = activeHabitPairs.map(pair => ({
    id: pair.vocal,
    daily: pair.daily,
    ...(VOCAL_HABITS.find(v => v.id === pair.vocal) ?? { label: pair.vocal, emoji: '🎙️' }),
  }));

  const closeCheckIn = () => {
    setShowCheckInModal(false);
    setCheckInStep(1);
    setCheckInConfidence(3);
    setCheckInSymptoms([]);
    setCheckInNotes('');
    setCheckInVocalEffort(5);
    setCheckInDemandLevel(3);
    setCheckInSupportArea(null);
    setHabitChecks({});
  };

  const stepSubtitle = checkInStep === 1 ? 'How is your voice feeling today?' : checkInStep === 2 ? 'Anything to note?' : 'Did you complete your habits?';

  const handleLogCheckIn = () => {
    if (!checkInSupportArea) return;
    const habitCheckEntries: HabitCheckEntry[] = CHECK_IN_HABITS
      .filter(h => habitChecks[h.id] !== null && habitChecks[h.id] !== undefined)
      .map(h => ({ daily: h.daily, vocal: h.id, completed: habitChecks[h.id] as boolean }));
    onCompleteCheckIn(checkInVocalEffort, checkInConfidence, checkInSymptoms, habitCheckEntries, checkInDemandLevel, checkInNotes, checkInSupportArea);
    closeCheckIn();
  };

  const completedCount = dailyRitualIds.filter(id => completedRitualIds.includes(id)).length;
  const dailyRituals = dailyRitualIds.map(id => EXERCISE_RITUALS.find(r => r.id === id)).filter(Boolean) as Ritual[];

  const categories = ['All', 'Ground', 'Breathe', 'Warm Up', 'Release', 'Resonate', 'Build'];

  // Calendar state
  const dateObj = new Date();
  const currentMonthName = dateObj.toLocaleString('default', { month: 'long' });
  const currentYearNum = dateObj.getFullYear();
  const currentDayNum = dateObj.getDate();
  const startDayOfWeek = new Date(currentYearNum, dateObj.getMonth(), 1).getDay();
  const totalDaysInMonth = new Date(currentYearNum, dateObj.getMonth() + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let s = 0; s < startDayOfWeek; s++) calendarDays.push(null);
  for (let d = 1; d <= totalDaysInMonth; d++) calendarDays.push(d);
  const completedDaysList = [3, 5, 9, 12, 14].filter(d => d < currentDayNum);


  // Filter rituals
  const filteredRituals = EXERCISE_RITUALS.filter(ritual => {
    const matchesCategory = selectedCategory === 'All' || ritual.category === selectedCategory;
    const matchesSearch = ritual.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ritual.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ritual.primaryFocus.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const startRitual = (ritual: Ritual) => {
    setSelectedRitual(ritual);
    setShowBenefitsModal(false);
    setIsRitualActive(false);
    setRitualStarted(false);
    setRitualCompleted(false);
    setFromRoutine(false);
  };

  const launchActivity = () => {
    setIsRitualActive(true);
    setShowBenefitsModal(false);
  };

  const exitActivity = () => {
    setIsRitualActive(false);
    setRitualStarted(false);
    setRitualCompleted(false);
  };

  const viewDetails = () => { setIsRitualActive(false); setFromRoutine(true); };

  const getFirstIncompleteRitual = (): Ritual | null => {
    const nextId = dailyRitualIds.find(id => !completedRitualIds.includes(id));
    return nextId ? (EXERCISE_RITUALS.find(r => r.id === nextId) ?? null) : null;
  };

  // Prefer another ritual already in today's routine's category, then any other ritual not
  // already assigned today — never re-offers the straw ritual itself.
  const pickStrawReplacement = (): Ritual | null => {
    const currentRoutine = new Set(dailyRitualIds);
    const category = selectedRitual?.category;
    const candidates = EXERCISE_RITUALS.filter(r => r.id !== STRAW_RITUAL_ID && !currentRoutine.has(r.id));
    const sameCategory = candidates.filter(r => r.category === category);
    return (sameCategory[0] ?? candidates[0]) ?? null;
  };

  const handleSwapStrawRitual = () => {
    if (!selectedRitual) return;
    const replacement = pickStrawReplacement();
    if (!replacement) return;
    onSwapRitual?.(selectedRitual.id, replacement.id);
    setSelectedRitual(replacement);
  };

  const handleMarkComplete = () => {
    const currentId = selectedRitual!.id;
    setRitualCompleted(true);
    setRitualFeedbackId(currentId);
    setRitualFeelingRating(5);
    setRitualDifficultyRating(5);
  };

  const submitRitualFeedback = () => {
    const currentId = ritualFeedbackId;
    if (!currentId) return;
    onCompleteRitual(currentId, ritualFeelingRating, ritualDifficultyRating);
    setRitualFeedbackId(null);

    const updatedCompleted = [...completedRitualIds, currentId];
    const nextId = dailyRitualIds.find(id => !updatedCompleted.includes(id));
    const next = nextId ? EXERCISE_RITUALS.find(r => r.id === nextId) ?? null : null;
    if (next) {
      setSelectedRitual(next);
      setShowBenefitsModal(false);
      setRitualStarted(false);
      setRitualCompleted(false);
      setIsRitualActive(true);
    } else {
      setSelectedRitual(null);
      setIsRitualActive(false);
      setRitualStarted(false);
      setRitualCompleted(false);
      setShowRoutineComplete(true);
    }
  };

  const handleStartDailyRituals = () => {
    if (completedCount === dailyRitualIds.length) {
      onRestartRoutine();
      return;
    }
    const nextRitual = getFirstIncompleteRitual();
    if (nextRitual) {
      startRitual(nextRitual);
      setIsRitualActive(true);
    }
  };

  React.useEffect(() => {
    if (autoStart && checkInDone) {
      handleStartDailyRituals();
      onAutoStartConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const getDetailHeroTheme = (category: string) => {
    switch (category) {
      case 'Ground': return { bg: 'bg-gradient-to-br from-amber-950/80 to-[#0d0f14]', glow: 'bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.15)_0%,transparent_70%)]', iconColor: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400', Icon: Anchor, accent: '#fbbf24' };
      case 'Breathe': return { bg: 'bg-gradient-to-br from-cyan-950/80 to-[#0d0f14]', glow: 'bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]', iconColor: 'text-cyan-400', badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400', Icon: Wind, accent: '#22d3ee' };
      case 'Warm Up': return { bg: 'bg-gradient-to-br from-orange-950/80 to-[#0d0f14]', glow: 'bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.15)_0%,transparent_70%)]', iconColor: 'text-orange-400', badge: 'bg-orange-500/10 border-orange-500/30 text-orange-400', Icon: Flame, accent: '#fb923c' };
      case 'Release': return { bg: 'bg-gradient-to-br from-emerald-950/80 to-[#0d0f14]', glow: 'bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.15)_0%,transparent_70%)]', iconColor: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', Icon: Feather, accent: '#34d399' };
      case 'Resonate': return { bg: 'bg-gradient-to-br from-fuchsia-950/80 to-[#0d0f14]', glow: 'bg-[radial-gradient(ellipse_at_center,rgba(232,121,249,0.15)_0%,transparent_70%)]', iconColor: 'text-fuchsia-400', badge: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400', Icon: AudioWaveform, accent: '#e879f9' };
      case 'Build': return { bg: 'bg-gradient-to-br from-rose-950/80 to-[#0d0f14]', glow: 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.15)_0%,transparent_70%)]', iconColor: 'text-rose-400', badge: 'bg-rose-500/10 border-rose-500/30 text-rose-400', Icon: Hammer, accent: '#fb7185' };
      default: return { bg: 'bg-gradient-to-br from-[#17A9C9]/20 to-[#0d0f14]', glow: 'bg-[radial-gradient(ellipse_at_center,rgba(23,169,201,0.15)_0%,transparent_70%)]', iconColor: 'text-[#21e8ff]', badge: 'bg-[#17A9C9]/10 border-[#17A9C9]/30 text-[#21e8ff]', Icon: Sparkles, accent: '#21e8ff' };
    }
  };

  return (
    <div className="w-full pb-10" id="rituals-page-container">
      {/* Daily Rituals Progress Banner */}
      {!selectedRitual && (
        <motion.div
          className={`mb-8 rounded-[30px] p-5.5 relative overflow-hidden group select-none transition-all duration-300 ${activePrepEvent
            ? 'bg-gradient-to-r from-[#3b82f6]/20 via-[#3b82f6]/10 to-[#12141a]/95 border border-[#3b82f6]/45 hover:border-[#3b82f6]/60'
            : 'bg-gradient-to-r from-[#17A9C9]/15 via-[#17A9C9]/8 to-[#12141a]/95 border border-[#17A9C9]/35 shadow-[0_0_25px_rgba(23,169,201,0.06)] hover:border-[#17A9C9]/45'
            }`}
          animate={activePrepEvent ? {
            boxShadow: [
              '0 0 28px rgba(59,130,246,0.18)',
              '0 0 46px rgba(59,130,246,0.32)',
              '0 0 28px rgba(59,130,246,0.18)',
            ],
          } : undefined}
          transition={activePrepEvent ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          {/* Subtle top/sides bright ambient glow */}
          <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent ${activePrepEvent ? 'via-[#60a5fa]/60' : 'via-[#21e8ff]/35'}`} />
          <div className={`absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b to-transparent ${activePrepEvent ? 'from-[#60a5fa]/40' : 'from-[#21e8ff]/20'}`} />

          <div className={`absolute -right-10 -bottom-10 w-44 h-44 rounded-full blur-[40px] pointer-events-none group-hover:scale-110 transition-transform duration-700 ${activePrepEvent ? 'bg-[#3b82f6]/20' : 'bg-[#17A9C9]/10'}`} />

          <AnimatePresence>
            {ritualsLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-[30px]"
                style={{ background: 'rgba(10,12,17,0.82)', backdropFilter: 'blur(6px)' }}
              >
                <span className={`text-[11px] font-mono tracking-[0.2em] uppercase ${activePrepEvent ? 'text-[#60a5fa]' : 'text-[#21e8ff]'}`}>
                  Building your routine...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4 pl-2">
              <div className="flex flex-col">
                <h3 className="text-[13px] font-semibold text-white tracking-wide mb-1 flex items-center flex-wrap gap-2.5">
                  Daily Vocal Protocol
                </h3>
                {activePrepEvent && (
                  <div
                    className="mb-2.5 flex items-center gap-2 rounded-full w-fit"
                  >
                    <span className="text-[10.5px] font-mono text-zinc-300 tracking-wide">
                      <span className="text-[#60a5fa] font-semibold">Prep Mode</span> · {activePrepEvent.title}
                    </span>
                    <span className="w-px h-3 bg-[#60a5fa]/25 flex-shrink-0" />
                    <span className="text-[10.5px] font-mono font-semibold text-[#60a5fa] whitespace-nowrap">
                      {activePrepEvent.daysLeft}d left
                    </span>
                  </div>
                )}
                <p className="text-[11.5px] text-zinc-400 max-w-2xl leading-relaxed mb-3">
                  {activePrepEvent?.aiInsight
                    ? activePrepEvent.aiInsight
                    : checkInDone && ritualInsight
                      ? ritualInsight
                      : 'Complete your personalized voice exercises and daily check-in to build healthier vocal habits and track your progress.'}
                </p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Daily Check-In Button */}
                  {checkInDone ? (
                    <button
                      disabled
                      className={`border px-5 py-2.5 text-[10px] font-semibold tracking-widest rounded-xl flex items-center gap-2 opacity-60 cursor-default w-fit ${activePrepEvent ? 'border-[#3b82f6]/25 bg-[#3b82f6]/5' : 'border-[#17A9C9]/25 bg-[#17A9C9]/5'}`}
                    >
                      <Check className={`w-3 h-3 ${activePrepEvent ? 'text-[#60a5fa]' : 'text-[#17A9C9]'}`} />
                      <span className={activePrepEvent ? 'text-[#60a5fa]' : 'text-[#17A9C9]'}>Checked In</span>
                    </button>
                  ) : null}
                  {checkInDone && onResetCheckIn && (
                    <button
                      onClick={onResetCheckIn}
                      className="text-[9px] font-mono tracking-widest uppercase text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                      title="Dev/testing only — clears today's check-in so you can log it again"
                    >
                      Reset (dev)
                    </button>
                  )}
                  {!checkInDone && (
                    <button
                      onClick={() => setShowCheckInModal(true)}
                      className={`relative overflow-hidden group/ci px-5 py-2.5 text-[10px] font-semibold tracking-widest uppercase rounded-xl flex items-center gap-2.5 transition-all duration-300 cursor-pointer w-fit border ${activePrepEvent
                        ? 'bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 border-[#3b82f6]/55 hover:border-[#60a5fa]/75 shadow-[0_0_12px_rgba(59,130,246,0.14)] hover:shadow-[0_0_18px_rgba(59,130,246,0.28)]'
                        : 'bg-[#17A9C9]/20 hover:bg-[#17A9C9]/30 border-[#17A9C9]/55 hover:border-[#21e8ff]/75 shadow-[0_0_12px_rgba(23,169,201,0.12)] hover:shadow-[0_0_18px_rgba(23,169,201,0.25)]'
                        }`}
                    >
                      <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -skew-x-12 translate-x-[-150%] group-hover/ci:translate-x-[250%] transition-transform duration-[1000ms] ease-in-out" />
                      <span className="text-white transition-colors duration-300">Daily Check-In</span>
                    </button>
                  )}

                  {/* Active/Start Daily Ritual Button */}
                  <div className="relative group/lock w-fit">
                    <button
                      onClick={checkInDone ? handleStartDailyRituals : undefined}
                      disabled={!checkInDone}
                      className={`relative overflow-hidden group/btn border px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase rounded-xl flex items-center gap-2.5 transition-all duration-300 w-fit ${checkInDone
                        ? activePrepEvent
                          ? 'bg-[#131722]/50 hover:bg-[#1b2130]/75 border-[#3b82f6]/30 hover:border-[#60a5fa]/60 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.02)] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                          : 'bg-[#131722]/50 hover:bg-[#1b2130]/75 border-[#17A9C9]/30 hover:border-[#21e8ff]/60 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.02)] hover:shadow-[0_0_15px_rgba(33,232,255,0.15)]'
                        : 'bg-zinc-900/40 border-zinc-700/60 cursor-not-allowed opacity-60'
                        }`}
                    >
                      {checkInDone && <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -skew-x-12 translate-x-[-150%] group-hover/btn:translate-x-[250%] transition-transform duration-[1200ms] ease-in-out" />}
                      <Play className={`w-3 h-3 fill-current opacity-80 ${checkInDone ? 'group-hover/btn:scale-110 transition-transform duration-300' : ''}`} />
                      <span className={`font-semibold tracking-widest transition-colors duration-300 ${checkInDone ? (activePrepEvent ? 'text-[#60a5fa] group-hover/btn:text-white' : 'text-[#21e8ff] group-hover/btn:text-white') : 'text-zinc-500'}`}>
                        {activePrepEvent
                          ? (completedCount === 0 ? 'Start Preparation Rituals' : completedCount === dailyRitualIds.length ? 'Restart Preparation' : 'Continue Preparation')
                          : (completedCount === 0 ? 'Start Daily Rituals' : completedCount === dailyRitualIds.length ? 'Restart Routine' : 'Continue Routine')}
                      </span>
                    </button>
                    {!checkInDone && (
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-700/60 opacity-0 group-hover/lock:opacity-100 transition-opacity duration-150 z-50">
                        Complete daily check-in to access
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-4.5 w-full md:w-auto md:border-l border-zinc-800/80 md:pl-6.5 flex-shrink-0 justify-between md:justify-start">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[9px] font-light text-zinc-500 uppercase tracking-widest mb-1.5">
                  Today's Routine
                </span>
                <span className="text-[18px] font-light text-zinc-400 font-light leading-none">
                  <span className="text-[#21e8ff] font-medium">{completedCount}</span>
                  <span className="text-zinc-700 mx-1">/</span>
                  <span>{dailyRitualIds.length}</span>
                </span>
              </div>

              {/* Circular progress wheel badge */}
              {(() => {
                const isAllDone = completedCount === dailyRitualIds.length && dailyRitualIds.length > 0;
                const pct = completedCount / Math.max(dailyRitualIds.length, 1);
                const circumference = 2 * Math.PI * 34;
                return (
                  <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                    <motion.svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 80 80"
                      animate={isAllDone ? { filter: ['drop-shadow(0 0 2px rgba(23,169,201,0.2))', 'drop-shadow(0 0 5px rgba(23,169,201,0.45))', 'drop-shadow(0 0 2px rgba(23,169,201,0.2))'] } : { filter: 'drop-shadow(0 0 0px transparent)' }}
                      transition={{ duration: 2, repeat: isAllDone ? Infinity : 0, ease: 'easeInOut' }}
                    >
                      <defs>
                        <linearGradient id="ringGradient" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
                          <stop offset="0%" stopColor="rgba(14,90,110,0.7)" />
                          <stop offset="100%" stopColor="rgba(23,169,201,0.85)" />
                        </linearGradient>
                      </defs>
                      <circle cx="40" cy="40" r="34" strokeWidth="4" fill="transparent" style={{ stroke: 'rgba(255,255,255,0.05)' }} />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        strokeWidth={isAllDone ? 5 : 4}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - pct)}
                        strokeLinecap="round"
                        fill="transparent"
                        style={{
                          stroke: 'url(#ringGradient)',
                          transition: 'stroke-dashoffset 0.5s ease, stroke-width 0.3s ease',
                        }}
                      />
                    </motion.svg>
                    {isAllDone ? (
                      <motion.div
                        className="absolute"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                      >
                        <Check className="w-5 h-5" style={{ color: '#21e8ff' }} strokeWidth={2.5} />
                      </motion.div>
                    ) : (
                      <span className="absolute text-[13px] font-mono font-medium text-zinc-300">
                        {Math.round(pct * 100)}%
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </motion.div>
      )}

      {/* Check-In Modal */}
      <AnimatePresence>
        {showCheckInModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={closeCheckIn}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-[28px] overflow-hidden relative"
              style={{
                background: 'linear-gradient(160deg, #0f1319 0%, #0b0e14 100%)',
                border: `1px solid rgba(${modalAccentRGB},0.2)`,
                boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(${modalAccentRGB},0.06), inset 0 1px 0 rgba(${modalAccentBrightRGB},0.08)`,
              }}
            >
              {/* Top sheen */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${modalAccentBrightHex}80, transparent)` }} />
              {/* Ambient corner glow */}
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[60px] pointer-events-none" style={{ background: `${modalAccentHex}1a` }} />
              <div className="absolute -bottom-16 -left-8 w-48 h-32 rounded-full blur-[60px] pointer-events-none" style={{ background: `${modalAccentHex}12` }} />

              {/* Header */}
              <div className="flex items-center justify-between px-7 pt-6 pb-5 relative z-10" style={{ borderBottom: `1px solid rgba(${modalAccentRGB},0.1)` }}>
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-white leading-tight">Daily Check-In</h3>
                    <p className="text-[10.5px] text-zinc-500 mt-0.5">{stepSubtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(s => (
                      <div key={s} className="w-5 h-1 rounded-full transition-all duration-300" style={{ background: checkInStep >= s ? `rgba(${modalAccentBrightRGB},0.7)` : 'rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                  <button onClick={closeCheckIn} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {checkInStep === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="px-7 py-6 flex flex-col gap-6 relative z-10"
                  >
                    {/* Vocal Effort slider */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-[11px] font-light uppercase tracking-[0.18em]" style={{ color: `${modalAccentHex}b3` }}>Vocal Effort</span>
                          <p className="text-[9px] text-zinc-600 mt-0.5">How much effort or strain does your voice take today?</p>
                        </div>
                        <span className="text-[11px] font-light tabular-nums" style={{ color: modalAccentBrightHex }}>{Math.round(checkInVocalEffort)} / 10</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.1}
                        value={checkInVocalEffort}
                        onChange={e => setCheckInVocalEffort(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-75 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab"
                        style={{
                          background: `linear-gradient(to right, rgba(14,90,110,0.8) 0%, rgba(${modalAccentRGB},0.9) ${checkInVocalEffort / 10 * 100}%, rgba(255,255,255,0.08) ${checkInVocalEffort / 10 * 100}%, rgba(255,255,255,0.08) 100%)`,
                          transition: 'background 0.05s linear',
                          filter: `drop-shadow(0 0 2px rgba(${modalAccentRGB},${0.15 + (checkInVocalEffort / 10) * 0.25}))`,
                        }}
                      />
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-zinc-600 font-mono">No effort</span>
                        <span className="text-[9px] text-zinc-600 font-mono">Max strain</span>
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div>
                      <span className="text-[11px] font-light uppercase tracking-[0.18em] block mb-3" style={{ color: `${modalAccentHex}b3` }}>Symptoms</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Hoarse', emoji: '🗣️' },
                          { label: 'Dry', emoji: '💧' },
                          { label: 'Tight', emoji: '😬' },
                          { label: 'Weak', emoji: '💨' },
                          { label: 'Fatigued', emoji: '😴' },
                          { label: 'Sore', emoji: '😣' },
                        ].map(({ label, emoji }) => {
                          const active = checkInSymptoms.includes(label);
                          return (
                            <motion.button
                              key={label}
                              onClick={() => setCheckInSymptoms(prev => active ? prev.filter(s => s !== label) : [...prev, label])}
                              whileTap={{ scale: 0.88 }}
                              transition={{ duration: 0.1 }}
                              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all duration-150 cursor-pointer"
                              style={active ? {
                                background: `rgba(${modalAccentRGB},0.15)`,
                                border: `1px solid rgba(${modalAccentBrightRGB},0.4)`,
                              } : {
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                              }}
                            >
                              <span className="text-2xl leading-none">{emoji}</span>
                              <span className="text-[10px] font-mono" style={{ color: active ? modalAccentBrightHex : '#71717a' }}>{label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fatigue level */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-light uppercase tracking-[0.18em]" style={{ color: `${modalAccentHex}b3` }}>Voice Confidence</span>
                        <span className="text-[11px] font-light" style={{ color: modalAccentBrightHex }}>{checkInConfidence} / 5</span>
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(n => {
                          const active = checkInConfidence >= n;
                          const t = n / 5;
                          return (
                            <button
                              key={n}
                              onClick={() => setCheckInConfidence(n)}
                              className="flex-1 h-8 rounded-lg transition-all duration-200 cursor-pointer text-[11px] font-mono"
                              style={active ? {
                                background: `linear-gradient(135deg, rgba(${modalAccentRGB},${0.08 + t * 0.32}) 0%, rgba(${modalAccentBrightRGB},${0.03 + t * 0.12}) 100%)`,
                                border: `1px solid rgba(${modalAccentBrightRGB},${0.15 + t * 0.48})`,
                                color: `rgba(${modalAccentBrightRGB},${0.45 + t * 0.55})`,
                                boxShadow: n === checkInConfidence ? `0 0 ${6 + t * 16}px rgba(${modalAccentBrightRGB},${t * 0.28})` : 'none',
                              } : {
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                color: '#52525b',
                              }}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-zinc-600 font-mono">Low</span>
                        <span className="text-[9px] text-zinc-600 font-mono">High</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setCheckInStep(2)}
                      className="relative overflow-hidden w-full py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer group/submit transition-all duration-300"
                      style={{
                        background: `linear-gradient(135deg, rgba(${modalAccentRGB},0.22) 0%, rgba(${modalAccentBrightRGB},0.10) 100%)`,
                        border: `1px solid rgba(${modalAccentBrightRGB},0.5)`,
                        boxShadow: `0 0 24px rgba(${modalAccentBrightRGB},0.12), inset 0 1px 0 rgba(${modalAccentBrightRGB},0.15)`,
                      }}
                    >
                      <div className="absolute inset-0 w-2/5 h-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -skew-x-12 -translate-x-full group-hover/submit:translate-x-[300%] transition-transform duration-[900ms] ease-in-out pointer-events-none" />
                      <span className="text-[11px] tracking-[0.22em] uppercase font-semibold group-hover/submit:text-white transition-colors duration-300 relative z-10" style={{ color: modalAccentBrightHex }}>
                        Continue
                      </span>
                    </button>
                  </motion.div>
                ) : checkInStep === 2 ? (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="px-7 py-6 flex flex-col gap-6 relative z-10"
                  >
                    {/* Demand level */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-[11px] font-light uppercase tracking-[0.18em]" style={{ color: `${modalAccentHex}b3` }}>Demand Level</span>
                          <p className="text-[9px] text-zinc-600 mt-0.5">On a scale of 1-5, how much did you use your voice today?</p>
                        </div>
                        <span className="text-[11px] font-light" style={{ color: modalAccentBrightHex }}>{checkInDemandLevel} / 5</span>
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(n => {
                          const active = checkInDemandLevel >= n;
                          const t = n / 5;
                          return (
                            <button
                              key={n}
                              onClick={() => setCheckInDemandLevel(n)}
                              className="flex-1 h-8 rounded-lg transition-all duration-200 cursor-pointer text-[11px] font-mono"
                              style={active ? {
                                background: `linear-gradient(135deg, rgba(${modalAccentRGB},${0.08 + t * 0.32}) 0%, rgba(${modalAccentBrightRGB},${0.03 + t * 0.12}) 100%)`,
                                border: `1px solid rgba(${modalAccentBrightRGB},${0.15 + t * 0.48})`,
                                color: `rgba(${modalAccentBrightRGB},${0.45 + t * 0.55})`,
                                boxShadow: n === checkInDemandLevel ? `0 0 ${6 + t * 16}px rgba(${modalAccentBrightRGB},${t * 0.28})` : 'none',
                              } : {
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                color: '#52525b',
                              }}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-zinc-600 font-mono">Barely used</span>
                        <span className="text-[9px] text-zinc-600 font-mono">Constant use</span>
                      </div>
                    </div>

                    {/* Support areas */}
                    <div>
                      <span className="text-[11px] font-light uppercase tracking-[0.18em] block mb-3" style={{ color: `${modalAccentHex}b3` }}>What area needs support today? <span className="text-white/70 normal-case tracking-normal">*</span></span>
                      <div className="flex justify-between gap-1">
                        {[
                          { label: 'Breath & fatigue', icon: <Wind className="w-5 h-5" /> },
                          { label: 'Body tension', icon: <Activity className="w-5 h-5" /> },
                          { label: 'Throat irritation', icon: <Flame className="w-5 h-5" /> },
                          { label: 'Confidence', icon: <Sparkles className="w-5 h-5" /> },
                          { label: 'Recovery', icon: <Clock className="w-5 h-5" /> },
                        ].map(({ label, icon }) => {
                          const active = checkInSupportArea === label;
                          return (
                            <motion.button
                              key={label}
                              onClick={() => setCheckInSupportArea(active ? null : label)}
                              whileTap={{ scale: 0.88 }}
                              transition={{ duration: 0.1 }}
                              className="flex flex-col items-center gap-2 cursor-pointer"
                            >
                              <div
                                className="w-13 h-13 rounded-full flex items-center justify-center transition-all duration-200"
                                style={active ? {
                                  background: `linear-gradient(135deg, rgba(${modalAccentRGB},0.22) 0%, rgba(${modalAccentBrightRGB},0.08) 100%)`,
                                  border: `1px solid rgba(${modalAccentBrightRGB},0.45)`,
                                  boxShadow: `0 0 14px rgba(${modalAccentRGB},0.18), inset 0 1px 0 rgba(255,255,255,0.1)`,
                                } : {
                                  background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.09)',
                                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                                }}
                              >
                                <span style={{ color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}>{icon}</span>
                              </div>
                              <span className="text-[9px] font-mono text-center leading-tight w-14" style={{ color: active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)' }}>{label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-light uppercase tracking-[0.18em] block mb-2" style={{ color: `${modalAccentHex}b3` }}>Notes <span className="text-zinc-600 font-light"> (optional)</span></span>
                      <textarea
                        value={checkInNotes}
                        onChange={e => setCheckInNotes(e.target.value)}
                        placeholder="Anything to note about your voice today..."
                        rows={3}
                        autoFocus
                        className="w-full resize-none rounded-xl px-4 py-3 text-[12px] text-zinc-300 placeholder-zinc-600 focus:outline-none transition-colors duration-150"
                        style={{ background: `rgba(${modalAccentRGB},0.04)`, border: `1px solid rgba(${modalAccentRGB},0.15)` }}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCheckInStep(1)}
                        className="py-3.5 px-5 rounded-xl text-[11px] font-mono tracking-widest uppercase text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        Back
                      </button>
                      <button
                        onClick={() => checkInSupportArea && setCheckInStep(3)}
                        disabled={!checkInSupportArea}
                        className="relative overflow-hidden flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group/submit"
                        style={{
                          background: `linear-gradient(135deg, rgba(${modalAccentRGB},0.22) 0%, rgba(${modalAccentBrightRGB},0.10) 100%)`,
                          border: `1px solid rgba(${modalAccentBrightRGB},0.5)`,
                          boxShadow: `0 0 24px rgba(${modalAccentBrightRGB},0.12), inset 0 1px 0 rgba(${modalAccentBrightRGB},0.15)`,
                        }}
                      >
                        <div className="absolute inset-0 w-2/5 h-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -skew-x-12 -translate-x-full group-hover/submit:translate-x-[300%] transition-transform duration-[900ms] ease-in-out pointer-events-none" />
                        <span className="text-[11px] tracking-[0.22em] uppercase font-semibold group-hover/submit:text-white transition-colors duration-300 relative z-10" style={{ color: modalAccentBrightHex }}>
                          Continue
                        </span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    className="px-7 py-6 flex flex-col gap-5 relative z-10"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-light uppercase tracking-[0.18em]" style={{ color: `${modalAccentHex}b3` }}>Habits</span>
                      <p className="text-[12px] text-zinc-400 font-light leading-relaxed">Mark each habit you completed today.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      {CHECK_IN_HABITS.map(habit => {
                        const val = habitChecks[habit.id] ?? null;
                        return (
                          <div
                            key={habit.id}
                            className="flex items-center justify-between gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200"
                            style={val !== null ? {
                              background: `rgba(${modalAccentRGB},0.08)`,
                              border: `1px solid rgba(${modalAccentBrightRGB},0.25)`,
                              boxShadow: `0 0 16px rgba(${modalAccentRGB},0.08)`,
                            } : {
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.07)',
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xl leading-none flex-shrink-0">{habit.emoji}</span>
                              <span className="text-[12px] font-light text-zinc-300 leading-snug">{habit.label}</span>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => setHabitChecks(prev => ({ ...prev, [habit.id]: true }))}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer text-[11px] font-mono"
                                style={val === true ? {
                                  background: 'rgba(16,185,129,0.18)',
                                  border: '1px solid rgba(16,185,129,0.5)',
                                  color: '#34d399',
                                } : {
                                  background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  color: '#52525b',
                                }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setHabitChecks(prev => ({ ...prev, [habit.id]: false }))}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer text-[11px] font-mono"
                                style={val === false ? {
                                  background: 'rgba(239,68,68,0.12)',
                                  border: '1px solid rgba(239,68,68,0.35)',
                                  color: '#f87171',
                                } : {
                                  background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  color: '#52525b',
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 mt-1">
                      <button
                        onClick={() => setCheckInStep(2)}
                        className="py-3.5 px-5 rounded-xl text-[11px] font-mono tracking-widest uppercase text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleLogCheckIn}
                        disabled={CHECK_IN_HABITS.some(h => habitChecks[h.id] == null)}
                        className="relative overflow-hidden flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer group/log transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(135deg, rgba(${modalAccentRGB},0.22) 0%, rgba(${modalAccentBrightRGB},0.10) 100%)`,
                          border: `1px solid rgba(${modalAccentBrightRGB},0.5)`,
                          boxShadow: `0 0 24px rgba(${modalAccentBrightRGB},0.12), inset 0 1px 0 rgba(${modalAccentBrightRGB},0.15)`,
                        }}
                      >
                        <div className="absolute inset-0 w-2/5 h-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -skew-x-12 -translate-x-full group-hover/log:translate-x-[300%] transition-transform duration-[900ms] ease-in-out pointer-events-none" />
                        <span className="text-[11px] tracking-[0.22em] uppercase font-semibold group-hover/log:text-white transition-colors duration-300 relative z-10" style={{ color: modalAccentBrightHex }}>
                          Log it
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRoutineComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
            style={{ background: 'rgba(5,6,9,0.92)', backdropFilter: 'blur(20px)' }}
          >
            {/* Checkmark */}
            <motion.div
              className="relative flex items-center justify-center"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(23,169,201,0.1) 0%, transparent 70%)' }}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center relative z-10"
                style={{ background: 'rgba(23,169,201,0.08)', border: '1px solid rgba(33,232,255,0.2)' }}
              >
                <svg viewBox="0 0 52 52" className="w-16 h-16" fill="none">
                  <motion.path
                    d="M13 26 L22 35 L39 17"
                    stroke="#17A9C9"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
                  />
                </svg>
              </div>
            </motion.div>

            {/* Label */}
            <motion.p
              className="text-[10px] font-mono tracking-[0.28em] uppercase text-[#17A9C9]/60"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.75 }}
            >
              Daily Routine Complete
            </motion.p>

            {/* Count */}
            <motion.p
              className="text-[13px] text-zinc-600 font-light -mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 1.0 }}
            >
              {dailyRitualIds.length} ritual{dailyRitualIds.length !== 1 ? 's' : ''} completed today
            </motion.p>

            {/* Continue button */}
            <motion.button
              onClick={() => setShowRoutineComplete(false)}
              className="relative overflow-hidden px-10 py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer group/dismiss transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(23,169,201,0.14) 0%, rgba(33,232,255,0.06) 100%)',
                border: '1px solid rgba(33,232,255,0.28)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 1.3 }}
            >
              <div className="absolute inset-0 w-2/5 h-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent -skew-x-12 -translate-x-full group-hover/dismiss:translate-x-[300%] transition-transform duration-[900ms] ease-in-out pointer-events-none" />
              <span className="text-[11px] tracking-[0.22em] uppercase font-semibold text-[#17A9C9] group-hover/dismiss:text-white transition-colors duration-300 relative z-10">
                Continue
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ritual Library section header and filters/search inline */}
      {!selectedRitual && (
        <div className="mt-8 mb-4">
          <h2 className="text-base font-light tracking-tight text-white mb-3 font-display">
            Ritual Library
          </h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-zinc-900/40 pb-5">
            {/* Category filter tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs rounded-xl transition-all duration-300 border cursor-pointer ${selectedCategory === cat
                    ? `${CATEGORY_PILL_STYLES[cat] ?? 'bg-[#17A9C9]/25 border-[#17A9C9]/50'} text-white font-semibold tracking-wide`
                    : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Bar Input (moved inline) */}
            <div className="w-full md:w-72 relative flex items-center">
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pl-4 pr-10 rounded-2xl bg-[#13151c]/70 border border-zinc-800 focus:border-[#17A9C9]/50 focus:outline-none text-xs text-white"
              />
              <div className="absolute right-3.5 flex items-center pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {
        !selectedRitual ? (
          /* ================= LIBRARY VIEW ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRituals.length === 0 ? (
              <div className="col-span-full py-16 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/20">
                <span className="text-zinc-500 text-sm block mb-1">No rituals found matching your query</span>
                <button
                  onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                  className="text-xs text-[#21e8ff] hover:underline"
                >
                  Reset search criteria
                </button>
              </div>
            ) : (
              filteredRituals.map((ritual) => {

                // Define colored dots for each category
                let dotColor = "bg-[#21e8ff]";
                if (ritual.category === 'Ground') {
                  dotColor = "bg-amber-400";
                } else if (ritual.category === 'Breathe') {
                  dotColor = "bg-cyan-400";
                } else if (ritual.category === 'Warm Up') {
                  dotColor = "bg-orange-400";
                } else if (ritual.category === 'Release') {
                  dotColor = "bg-emerald-400";
                } else if (ritual.category === 'Resonate') {
                  dotColor = "bg-fuchsia-400";
                } else if (ritual.category === 'Build') {
                  dotColor = "bg-rose-400";
                }
                const categoryTextCol = 'text-zinc-400';

                // Custom color themes mapped dynamically based on categorization tags
                let itemTheme = {
                  wrapperClass: "bg-gradient-to-b from-[#17A9C9]/15 to-[#12141a]/90 hover:from-[#17A9C9]/22 hover:to-[#12141a]/95 border border-[#17A9C9]/30 hover:border-[#17A9C9]/50 shadow-[0_0_20px_rgba(23,169,201,0.06)] hover:shadow-[0_0_30px_rgba(23,169,201,0.12)]",
                  lightEdgeClass: "via-[#17A9C9]/55",
                  orbClass: "bg-[#17A9C9]/12 group-hover:bg-[#17A9C9]/25",
                  textAndActionColor: "text-[#21e8ff]"
                };

                if (ritual.category === 'Ground') {
                  itemTheme = {
                    wrapperClass: "bg-gradient-to-b from-amber-500/12 to-[#12141a]/90 hover:from-amber-500/20 hover:to-[#12141a]/95 border border-amber-500/25 hover:border-amber-500/45 shadow-[0_0_20px_rgba(245,158,11,0.04)] hover:shadow-[0_0_30px_rgba(245,158,11,0.10)]",
                    lightEdgeClass: "via-amber-400/45",
                    orbClass: "bg-amber-500/8 group-hover:bg-amber-500/18",
                    textAndActionColor: "text-amber-400"
                  };
                } else if (ritual.category === 'Breathe') {
                  itemTheme = {
                    wrapperClass: "bg-gradient-to-b from-cyan-500/12 to-[#12141a]/90 hover:from-cyan-500/20 hover:to-[#12141a]/95 border border-cyan-500/25 hover:border-cyan-500/45 shadow-[0_0_20px_rgba(6,182,212,0.04)] hover:shadow-[0_0_30px_rgba(6,182,212,0.10)]",
                    lightEdgeClass: "via-cyan-400/45",
                    orbClass: "bg-cyan-500/8 group-hover:bg-cyan-500/18",
                    textAndActionColor: "text-cyan-400"
                  };
                } else if (ritual.category === 'Warm Up') {
                  itemTheme = {
                    wrapperClass: "bg-gradient-to-b from-orange-500/12 to-[#12141a]/90 hover:from-orange-500/20 hover:to-[#12141a]/95 border border-orange-500/25 hover:border-orange-500/45 shadow-[0_0_20px_rgba(251,146,60,0.04)] hover:shadow-[0_0_30px_rgba(251,146,60,0.10)]",
                    lightEdgeClass: "via-orange-400/45",
                    orbClass: "bg-orange-500/8 group-hover:bg-orange-500/18",
                    textAndActionColor: "text-orange-400"
                  };
                } else if (ritual.category === 'Release') {
                  itemTheme = {
                    wrapperClass: "bg-gradient-to-b from-emerald-500/12 to-[#12141a]/90 hover:from-emerald-500/20 hover:to-[#12141a]/95 border border-emerald-500/25 hover:border-emerald-500/45 shadow-[0_0_20px_rgba(52,211,153,0.04)] hover:shadow-[0_0_30px_rgba(52,211,153,0.10)]",
                    lightEdgeClass: "via-emerald-400/45",
                    orbClass: "bg-emerald-500/8 group-hover:bg-emerald-500/18",
                    textAndActionColor: "text-emerald-400"
                  };
                } else if (ritual.category === 'Resonate') {
                  itemTheme = {
                    wrapperClass: "bg-gradient-to-b from-fuchsia-500/12 to-[#12141a]/90 hover:from-fuchsia-500/20 hover:to-[#12141a]/95 border border-fuchsia-500/25 hover:border-fuchsia-500/45 shadow-[0_0_20px_rgba(232,121,249,0.04)] hover:shadow-[0_0_30px_rgba(232,121,249,0.10)]",
                    lightEdgeClass: "via-fuchsia-400/45",
                    orbClass: "bg-fuchsia-500/8 group-hover:bg-fuchsia-500/18",
                    textAndActionColor: "text-fuchsia-400"
                  };
                } else if (ritual.category === 'Build') {
                  itemTheme = {
                    wrapperClass: "bg-gradient-to-b from-rose-500/12 to-[#12141a]/90 hover:from-rose-500/20 hover:to-[#12141a]/95 border border-rose-500/25 hover:border-rose-500/45 shadow-[0_0_20px_rgba(244,63,94,0.04)] hover:shadow-[0_0_30px_rgba(244,63,94,0.10)]",
                    lightEdgeClass: "via-rose-400/45",
                    orbClass: "bg-rose-500/8 group-hover:bg-rose-500/18",
                    textAndActionColor: "text-rose-400"
                  };
                }

                return (
                  <div
                    key={ritual.id}
                    onClick={() => startRitual(ritual)}
                    className={`${itemTheme.wrapperClass} rounded-[28px] p-5.5 transition-all duration-500 flex flex-col justify-between group cursor-pointer relative overflow-hidden`}
                  >
                    {/* Subtle top light edge */}
                    <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent ${itemTheme.lightEdgeClass} to-transparent z-10`} />

                    {/* Background animations / orbs */}
                    <div className={`absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 ${itemTheme.orbClass} rounded-full blur-[35px] pointer-events-none transition-all duration-500 group-hover:scale-110 z-0`} />

                    <div className="relative z-10">
                      {/* Header line: Category + duration info with a color-coded dot */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center gap-1.5 text-[9.5px] font-mono tracking-wide text-zinc-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          {ritual.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{ritual.duration}</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors mb-2 tracking-wide">
                        {ritual.name}
                      </h3>

                      <p className="text-[11.5px] text-zinc-500 leading-relaxed mb-6">
                        {ritual.description}
                      </p>
                    </div>

                    {/* Actions footer */}
                    <div className="border-t border-zinc-900/60 pt-4 flex items-center justify-between mt-auto relative z-10">
                      <div />
                      <span className={`transition-transform duration-300 group-hover:translate-x-1.5 ${itemTheme.textAndActionColor}`}>
                        <ArrowRight className="w-6 h-6 stroke-[2]" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : isRitualActive ? (() => {
          const heroTheme = getDetailHeroTheme(selectedRitual.category);
          const routineIndex = dailyRitualIds.indexOf(selectedRitual.id);
          const isInRoutine = routineIndex !== -1;

          const activityVisual = (() => {
            switch (selectedRitual.category) {
              case 'Warm Up':
                return (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.1)_0%,transparent_70%)] pointer-events-none" />
                    <div className="flex items-end gap-1.5 h-36">
                      {[18, 32, 14, 44, 28, 50, 20, 38, 12, 46, 24, 42, 16, 36, 26, 48, 22, 40].map((h, i) => (
                        <motion.div
                          key={i}
                          className="w-2 rounded-full"
                          style={{ background: 'linear-gradient(to top, #ea580c, #fdba74)', opacity: 0.5 + (i % 3) * 0.15 }}
                          animate={{ height: [`${h * 0.5}px`, `${h}px`, `${h * 0.5}px`] }}
                          transition={{ duration: 0.7 + (i % 5) * 0.15, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
                        />
                      ))}
                    </div>
                  </div>
                );
              case 'Ground':
                return (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.1)_0%,transparent_70%)] pointer-events-none" />
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-amber-400"
                        style={{ width: 60 + i * 45, height: 60 + i * 45, opacity: 0.22 - i * 0.05 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                      />
                    ))}
                    <div className="w-5 h-5 rounded-full bg-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.8)] z-10" />
                  </div>
                );
              case 'Breathe':
                return (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.1)_0%,transparent_70%)] pointer-events-none" />
                    <motion.div
                      className="rounded-full"
                      style={{ width: 100, height: 100, background: 'radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0.06) 100%)', border: '1px solid rgba(34,211,238,0.45)' }}
                      animate={{ scale: [0.85, 1.25, 0.85] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                );
              case 'Release':
                return (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.08)_0%,transparent_70%)] pointer-events-none" />
                    {[140, 95, 55].map((size, i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-emerald-400"
                        style={{ width: size, height: size, opacity: 0.25 - i * 0.04 }}
                        animate={{ scale: [1, 1.18, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                      />
                    ))}
                    <motion.div
                      className="w-14 h-14 rounded-full"
                      style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.35) 0%, rgba(52,211,153,0.08) 100%)', border: '1px solid rgba(52,211,153,0.4)' }}
                      animate={{ scale: [1, 1.22, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                );
              case 'Resonate':
                return (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,121,249,0.1)_0%,transparent_70%)] pointer-events-none" />
                    {[0, 1, 2, 3].map(i => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-fuchsia-400"
                        style={{ width: 70, height: 70 }}
                        animate={{ scale: [0.5 + i * 0.2, 1.8 + i * 0.25], opacity: [0.6, 0] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut', delay: i * 0.4 }}
                      />
                    ))}
                    <div className="w-4 h-4 rounded-full bg-fuchsia-400 shadow-[0_0_24px_rgba(232,121,249,0.9)] z-10" />
                  </div>
                );
              case 'Build':
                return (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.1)_0%,transparent_70%)] pointer-events-none" />
                    <div className="flex flex-col-reverse items-center gap-1.5">
                      {[0, 1, 2, 3].map(i => (
                        <motion.div
                          key={i}
                          className="w-14 h-3.5 rounded-md"
                          style={{ background: 'linear-gradient(90deg, #e11d48, #fb7185)' }}
                          animate={{ opacity: [0.25, 1, 1, 0.25], y: [10, 0, 0, 10] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4, times: [0, 0.2, 0.8, 1] }}
                        />
                      ))}
                    </div>
                  </div>
                );
              default:
                return (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(23,169,201,0.1)_0%,transparent_70%)] pointer-events-none" />
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-[#21e8ff]"
                        style={{ width: 60 + i * 50, height: 60 + i * 50, opacity: 0.2 - i * 0.05 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
                      />
                    ))}
                    <div className="w-4 h-4 rounded-full bg-[#21e8ff] shadow-[0_0_24px_rgba(33,232,255,0.8)] z-10" />
                  </div>
                );
            }
          })();

          return (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative rounded-[28px] overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #13161e 0%, #0f1117 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
                minHeight: ritualCompleted ? '420px' : '520px',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#17A9C9]/30 to-transparent pointer-events-none z-10" />
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                {/* LEFT — Activity visual + Start */}
                <div className="relative flex flex-col border-b border-white/[0.05] lg:border-b-0 lg:border-r">
                  <div className="absolute -bottom-24 -right-12 w-56 h-56 bg-[#17A9C9]/5 rounded-full blur-[70px] pointer-events-none" />

                  {/* Animation canvas — uploaded player media wins over the procedural visual when present */}
                  <div className={`flex-1 relative overflow-hidden ${ritualCompleted ? 'min-h-[280px]' : 'min-h-[380px]'}`}>
                    {selectedRitual.playerMedia ? (
                      selectedRitual.playerMedia.type === 'video' ? (
                        <video
                          key={selectedRitual.playerMedia.url}
                          src={selectedRitual.playerMedia.url}
                          className="absolute inset-0 w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={selectedRitual.playerMedia.url}
                          alt={selectedRitual.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )
                    ) : activityVisual}
                  </div>

                  {/* Start / Mark Complete button */}
                  <div className="px-7 pb-7 pt-4">
                    <div className="h-px mb-4" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />
                    {ritualCompleted ? null : ritualStarted ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 justify-center">
                          <motion.div
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                          />
                          <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-zinc-500">Session in progress</span>
                        </div>
                        <button
                          onClick={handleMarkComplete}
                          className="relative overflow-hidden w-full py-4 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer group/done transition-all duration-300"
                          style={{
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.10) 100%)',
                            border: '1px solid rgba(16,185,129,0.55)',
                            boxShadow: '0 0 28px rgba(16,185,129,0.18), inset 0 1px 0 rgba(16,185,129,0.2)',
                          }}
                        >
                          <div className="absolute inset-0 w-2/5 h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -skew-x-12 -translate-x-full group-hover/done:translate-x-[300%] transition-transform duration-[900ms] ease-in-out pointer-events-none" />
                          <Check className="w-3.5 h-3.5 text-emerald-400 group-hover/done:text-white transition-colors duration-300 relative z-10" />
                          <span className="text-[11.5px] tracking-[0.22em] uppercase font-semibold text-emerald-400 group-hover/done:text-white transition-colors duration-300 relative z-10">
                            Mark Complete
                          </span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRitualStarted(true)}
                        className="relative overflow-hidden w-full py-4 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer group/start transition-all duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${heroTheme.accent}38 0%, ${heroTheme.accent}1a 100%)`,
                          border: `1px solid ${heroTheme.accent}8c`,
                          boxShadow: `0 0 28px ${heroTheme.accent}26, inset 0 1px 0 ${heroTheme.accent}2e`,
                        }}
                      >
                        <div className="absolute inset-0 w-2/5 h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -skew-x-12 -translate-x-full group-hover/start:translate-x-[300%] transition-transform duration-[900ms] ease-in-out pointer-events-none" />
                        <Play className="w-3.5 h-3.5 transition-colors duration-300 relative z-10" style={{ fill: heroTheme.accent, color: heroTheme.accent }} />
                        <span className="text-[11.5px] tracking-[0.22em] uppercase font-semibold transition-colors duration-300 relative z-10" style={{ color: heroTheme.accent }}>
                          Start
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT — Title + Steps + View Details */}
                <div className="relative flex flex-col" style={{ background: 'rgba(255,255,255,0.055)' }}>
                  {/* Accent glow behind header */}
                  <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(23,169,201,0.07) 0%, transparent 70%)' }} />
                  <div className="absolute -bottom-24 -left-12 w-56 h-56 rounded-full blur-[70px] pointer-events-none" style={{ background: `${heroTheme.accent}0d` }} />

                  {/* Routine position + tooltip */}
                  {isInRoutine && (
                    <div className="absolute top-6 right-7 z-20 group/counter">
                      <div className="flex items-baseline gap-1 cursor-default select-none">
                        <span className="text-[18px] font-light leading-none text-white">{routineIndex + 1}</span>
                        <span className="text-[11px] text-zinc-500 font-light">/</span>
                        <span className="text-[13px] text-zinc-400 font-light">{dailyRitualIds.length}</span>
                      </div>

                      {/* Tooltip */}
                      <div
                        className="absolute top-full right-0 mt-2.5 w-56 pointer-events-none opacity-0 translate-y-1 group-hover/counter:opacity-100 group-hover/counter:translate-y-0 transition-all duration-200 ease-out"
                        style={{
                          background: 'linear-gradient(to bottom, rgba(17,19,25,0.98), rgba(12,14,18,0.98))',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '14px',
                          boxShadow: '0 16px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-px rounded-t-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <div className="py-1.5">
                          {dailyRituals.map((ritual, i) => {
                            const isCurrent = i === routineIndex;
                            const isDone = completedRitualIds.includes(ritual.id);
                            return (
                              <div
                                key={ritual.id}
                                className="flex items-center gap-3 px-4 py-2.5"
                                style={isCurrent ? { background: 'rgba(255,255,255,0.04)' } : {}}
                              >
                                <div className="w-3.5 flex-shrink-0 flex items-center justify-center">
                                  {isDone && <Check className="w-3 h-3 text-[#21e8ff]" />}
                                </div>
                                <span className={`text-[11px] leading-snug truncate ${isDone ? 'text-zinc-500' : isCurrent ? 'text-white' : 'text-zinc-400'}`}>
                                  {ritual.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-8 pb-5 relative z-10">
                    {/* Header */}
                    <div className="mb-8">
                      <span className={`inline-block text-[9.5px] font-mono tracking-[0.18em] uppercase px-3 py-1 rounded-full border mb-3 ${heroTheme.badge}`}>
                        {selectedRitual.category}
                      </span>
                      <h1 className="text-[1.75rem] font-semibold tracking-tight text-white leading-tight mb-2.5">
                        {selectedRitual.name}
                      </h1>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-zinc-300 bg-zinc-800/50 border border-zinc-700/50 px-3 py-1 rounded-full">
                        {selectedRitual.primaryFocus}
                      </span>
                    </div>

                    {selectedRitual.id === STRAW_RITUAL_ID && isInRoutine && !completedRitualIds.includes(selectedRitual.id) && (
                      <div
                        className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-[11.5px] text-amber-200/80 flex-1 leading-snug">
                          This ritual uses a straw. Don't have one?
                        </p>
                        <button
                          onClick={handleSwapStrawRitual}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest text-amber-300 hover:text-amber-100 transition-colors duration-150 cursor-pointer"
                          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}
                        >
                          <Shuffle className="w-3 h-3" />
                          Swap
                        </button>
                      </div>
                    )}

                    <AnimatePresence mode="wait">
                      {ritualCompleted ? (
                        <motion.div
                          key="feedback"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.35 }}
                          className="flex flex-col gap-6"
                        >
                          <p className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white">
                            Quick Feedback
                          </p>
                          <div className="flex flex-col gap-5">
                            <RitualFeedbackSlider label="How did that feel?" value={ritualFeelingRating} onChange={setRitualFeelingRating} accent={heroTheme.accent} />
                            <RitualFeedbackSlider label="How difficult was that?" value={ritualDifficultyRating} onChange={setRitualDifficultyRating} accent={heroTheme.accent} />
                          </div>
                          <button
                            onClick={submitRitualFeedback}
                            className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-semibold transition-all duration-200 cursor-pointer"
                            style={{
                              background: `linear-gradient(135deg, ${heroTheme.accent}38 0%, ${heroTheme.accent}1a 100%)`,
                              border: `1px solid ${heroTheme.accent}8c`,
                              color: heroTheme.accent,
                            }}
                          >
                            Done
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="steps"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.35 }}
                        >
                          <p className="text-[9.5px] font-mono uppercase tracking-[0.2em] mb-5 text-white">
                            Steps
                          </p>

                          {/* Connected steps */}
                          <div className="relative flex flex-col">
                            {selectedRitual.instructionSteps.map((step, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25, delay: i * 0.06 }}
                                className="flex gap-4 items-start relative -mx-2 px-2 py-2.5 rounded-xl cursor-default"
                              >
                                {/* Connector to next step — only between boxes */}
                                {i < selectedRitual.instructionSteps.length - 1 && (
                                  <div className="absolute left-[21px] top-[38px] bottom-0 w-px pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(255,255,255,0.04))' }} />
                                )}
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 relative z-10"
                                  style={{
                                    background: '#181c25',
                                    border: '1px solid rgba(255,255,255,0.18)',
                                    color: '#ffffff',
                                  }}
                                >
                                  {i + 1}
                                </div>
                                <p className="text-[13.5px] text-zinc-200 leading-relaxed pt-1">{step}</p>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* View Details + Exit — hidden while post-ritual feedback is active */}
                  {!ritualCompleted && (
                    <div className="px-8 pb-8 pt-2 mt-auto relative z-10">
                      <div className="h-px mb-4" style={{ background: `linear-gradient(to right, transparent, ${heroTheme.accent}20, transparent)` }} />
                      <div className="flex gap-3">
                        <button
                          onClick={viewDetails}
                          className="flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer group/details"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                            (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.14)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                            (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.08)';
                          }}
                        >
                          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-300 group-hover/details:text-white transition-colors duration-200">
                            View Details
                          </span>
                        </button>
                        <button
                          onClick={exitActivity}
                          className="py-3.5 px-4 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer group/exit"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                            (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(239,68,68,0.25)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                            (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.08)';
                          }}
                        >
                          <X className="w-3.5 h-3.5 text-zinc-400 group-hover/exit:text-red-400 transition-colors duration-200" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })() : (() => {
          const heroTheme = getDetailHeroTheme(selectedRitual.category);
          const HeroIcon = heroTheme.Icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col"
            >
              {/* Back button */}
              <div className="mb-6 flex items-center gap-3">
                <button
                  onClick={() => { setSelectedRitual(null); setShowBenefitsModal(false); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105"
                  style={{ background: 'rgba(23,169,201,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}
                >
                  <ChevronLeft className="w-4 h-4 text-[#21e8ff]" />
                </button>
                <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-500">Ritual Library</span>
              </div>

              {/* 2-column grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

                {/* LEFT — Steps + Actions */}
                <div
                  className="relative rounded-[28px] overflow-hidden flex flex-col"
                  style={{
                    background: 'linear-gradient(160deg, #13161e 0%, #0f1117 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Top sheen */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#17A9C9]/30 to-transparent" />
                  {/* Ambient corner glow */}
                  <div className="absolute -bottom-24 -left-12 w-56 h-56 bg-[#17A9C9]/6 rounded-full blur-[70px] pointer-events-none" />

                  <div className="p-7 pb-5">
                    {/* Description */}
                    <span className="inline-block text-[9.5px] font-mono uppercase tracking-[0.18em] text-zinc-600 bg-zinc-900/60 border border-zinc-800/50 px-3 py-1 rounded-full mb-3">
                      {selectedRitual.primaryFocus}
                    </span>
                    <p className="text-[13px] text-zinc-400 leading-[1.8] border-l-2 border-[#17A9C9]/25 pl-4 mb-7">
                      {selectedRitual.description}
                    </p>

                    <p className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-6">
                      How to do it
                    </p>

                    {/* Steps with connecting line */}
                    <div className="relative flex flex-col">
                      {selectedRitual.instructionSteps.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.06 }}
                          className="flex gap-4 items-start relative group/step -mx-2 px-2 py-2.5 rounded-xl hover:bg-white/[0.025] transition-colors duration-200 cursor-default"
                        >
                          {i < selectedRitual.instructionSteps.length - 1 && (
                            <div className="absolute left-[21px] top-[38px] bottom-0 w-px pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(23,169,201,0.35), rgba(23,169,201,0.08))' }} />
                          )}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 relative z-10 transition-all duration-200 group-hover/step:shadow-[0_0_16px_rgba(23,169,201,0.3)]"
                            style={{
                              background: '#0f1117',
                              border: '1px solid rgba(23,169,201,0.35)',
                              color: '#21e8ff',
                            }}
                          >
                            {i + 1}
                          </div>
                          <p className="text-[13px] text-zinc-400 group-hover/step:text-zinc-200 leading-relaxed pt-1 transition-colors duration-200">{step}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Actions area */}
                  <div className="px-7 pb-7 pt-2 mt-auto">
                    <div className="h-px mb-4" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />

                    <div className="flex gap-2.5">
                      {/* Why it works button */}
                      <button
                        onClick={() => setShowBenefitsModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer group/why flex-shrink-0"
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(23,169,201,0.06)';
                          (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(23,169,201,0.25)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.025)';
                          (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.06)';
                        }}
                      >
                        <span className="text-[11px] font-light uppercase tracking-[0.15em] text-zinc-400 group-hover/why:text-white transition-colors duration-200 whitespace-nowrap">
                          Why it works
                        </span>
                        <span className="text-[9.5px] font-mono text-[#21e8ff]/50 bg-[#17A9C9]/10 border border-[#17A9C9]/20 px-1.5 py-0.5 rounded-full tabular-nums">
                          {selectedRitual.benefits.length}
                        </span>
                      </button>

                      {/* Start Ritual CTA */}
                      <button
                        onClick={launchActivity}
                        className="relative overflow-hidden flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer group/start transition-all duration-300"
                        style={{
                          background: 'linear-gradient(135deg, rgba(23,169,201,0.22) 0%, rgba(33,232,255,0.10) 100%)',
                          border: '1px solid rgba(33,232,255,0.55)',
                          boxShadow: '0 0 28px rgba(33,232,255,0.15), 0 0 60px rgba(23,169,201,0.07), inset 0 1px 0 rgba(33,232,255,0.18)',
                        }}
                      >
                        {/* Shimmer sweep */}
                        <div className="absolute inset-0 w-2/5 h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -skew-x-12 -translate-x-full group-hover/start:translate-x-[300%] transition-transform duration-[900ms] ease-in-out pointer-events-none" />
                        {fromRoutine ? (
                          <ArrowRight className="w-3.5 h-3.5 text-[#21e8ff] group-hover/start:text-white transition-colors duration-300 relative z-10" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-[#21e8ff] group-hover/start:fill-white transition-colors duration-300 relative z-10" />
                        )}
                        <span className="text-[11.5px] tracking-[0.22em] uppercase font-semibold text-[#21e8ff] group-hover/start:text-white transition-colors duration-300 relative z-10">
                          {fromRoutine ? 'Continue' : 'Start Ritual'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Hero + Description */}
                <div
                  className="rounded-[28px] overflow-hidden relative flex flex-col"
                  style={{
                    background: 'linear-gradient(160deg, #13161e 0%, #0f1117 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Media */}
                  <div
                    className={`relative h-[22rem] flex items-center justify-center overflow-hidden ${heroTheme.bg}`}
                    data-slot="ritual-media"
                  >
                    {selectedRitual.overviewMedia ? (
                      selectedRitual.overviewMedia.type === 'video' ? (
                        <video
                          key={selectedRitual.overviewMedia.url}
                          src={selectedRitual.overviewMedia.url}
                          className="absolute inset-0 w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={selectedRitual.overviewMedia.url}
                          alt={selectedRitual.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <>
                        {/* Animated breathing glow */}
                        <motion.div
                          className={`absolute inset-0 ${heroTheme.glow} pointer-events-none`}
                          animate={{ opacity: [0.55, 1, 0.55] }}
                          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        {/* Secondary radial pulse */}
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 60%)' }}
                        />

                        {/* Floating icon */}
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                          className="relative z-10"
                        >
                          <HeroIcon className={`w-40 h-40 ${heroTheme.iconColor} opacity-[0.12]`} />
                        </motion.div>
                      </>
                    )}

                    {/* Badges */}
                    <div className="absolute top-4 left-4 z-20">
                      <span className={`text-[9.5px] font-mono tracking-[0.18em] uppercase px-3 py-1 rounded-full border backdrop-blur-sm ${heroTheme.badge}`}>
                        {selectedRitual.category}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 z-20">
                      <span className="text-[9.5px] font-mono text-zinc-400 tracking-wider bg-zinc-950/70 backdrop-blur-sm border border-zinc-800/60 px-2.5 py-1 rounded-full">
                        {selectedRitual.difficulty}
                      </span>
                    </div>

                    {/* Bottom name strip — gradient fades into card bg */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-5 pt-20"
                      style={{ background: 'linear-gradient(to top, #13161e 0%, #13161e 30%, transparent 100%)' }}
                    >
                      <h1 className="text-[22px] font-light tracking-tight text-white leading-tight">{selectedRitual.name}</h1>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span className="text-[11px] text-zinc-500 font-mono">{selectedRitual.duration}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Benefits modal */}
              <AnimatePresence>
                {showBenefitsModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg"
                    style={{ background: 'rgba(7,8,11,0.82)' }}
                    onClick={() => setShowBenefitsModal(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: 10 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-full max-w-md rounded-[28px] overflow-hidden"
                      style={{
                        background: 'linear-gradient(160deg, #0e1118 0%, #0a0c11 100%)',
                        border: '1px solid rgba(23,169,201,0.2)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.7), 0 0 40px rgba(23,169,201,0.05)',
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#21e8ff]/25 to-transparent" />
                      <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-[60px] pointer-events-none" style={{ background: 'rgba(23,169,201,0.07)' }} />

                      <div className="flex items-center justify-between p-6 pb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(23,169,201,0.15)', border: '1px solid rgba(23,169,201,0.3)' }}>
                            <span className="text-[#21e8ff]">?</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-light text-white leading-none">Why it works</h3>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{selectedRitual.benefits.length} clinical benefits</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowBenefitsModal(false)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <ul className="flex flex-col px-6 pb-6 gap-3 relative z-10">
                        {selectedRitual.benefits.map((benefit, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.18, delay: i * 0.05 }}
                            className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0"
                          >
                            <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-[9.5px] font-mono font-bold mt-0.5"
                              style={{ background: 'rgba(23,169,201,0.12)', border: '1px solid rgba(23,169,201,0.25)', color: '#21e8ff' }}
                            >
                              {i + 1}
                            </div>
                            <span className="text-[13px] text-zinc-300 leading-relaxed">{benefit}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })()
      }

    </div >
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; completed: number; date: string } }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#12141a] border border-zinc-800/80 px-3 py-2 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-sans">
        <p className="text-[10px] text-zinc-500 font-mono mb-0.5">{data.date} ({label})</p>
        <p className="text-xs font-semibold text-[#21e8ff] flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
          {data.completed} {data.completed === 1 ? 'Ritual' : 'Rituals'} Completed
        </p>
      </div>
    );
  }
  return null;
};
