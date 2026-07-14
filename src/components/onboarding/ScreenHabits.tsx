import { useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HabitPair } from '../../types/onboarding';

interface Props {
  value: HabitPair[];
  onChange: (pairs: HabitPair[]) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

export const DAILY_HABITS = [
  { id: 'morning_coffee', label: 'Morning coffee', emoji: '☕' },
  { id: 'brush_teeth', label: 'Brushing teeth', emoji: '🪥' },
  { id: 'morning_shower', label: 'Morning shower', emoji: '🚿' },
  { id: 'lunch_break', label: 'Lunch break', emoji: '🍽️' },
  { id: 'evening_walk', label: 'Evening walk', emoji: '🚶' },
  { id: 'bedtime_routine', label: 'Bedtime routine', emoji: '🌙' },
];

export const VOCAL_HABITS = [
  { id: 'drink_water', label: 'Drink a glass of water', emoji: '💧' },
  { id: 'vocal_hum', label: '2-min vocal hum', emoji: '🎵' },
  { id: 'lip_trill', label: 'Lip trill exercise', emoji: '💋' },
  { id: 'deep_breath', label: 'Deep breathing', emoji: '🌬️' },
  { id: 'jaw_stretch', label: 'Neck & jaw stretch', emoji: '🧘' },
  { id: 'silent_rest', label: 'Silent rest (2 min)', emoji: '🤫' },
];

const MIN_PAIRS = 3;

export default function ScreenHabits({ value, onChange, onNext, onBack, step, totalSteps }: Props) {
  const [pendingDaily, setPendingDaily] = useState<string | null>(null);

  const pairedDailyIds = new Set(value.map(p => p.daily));
  const pairedVocalIds = new Set(value.map(p => p.vocal));

  const handleDailyClick = (id: string) => {
    if (pairedDailyIds.has(id)) return; // already paired
    setPendingDaily(prev => prev === id ? null : id);
  };

  const handleVocalClick = (id: string) => {
    if (pairedVocalIds.has(id)) return; // already paired
    if (!pendingDaily) return;
    onChange([...value, { daily: pendingDaily, vocal: id }]);
    setPendingDaily(null);
  };

  const removePair = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const canContinue = value.length >= MIN_PAIRS;

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center font-sans relative overflow-hidden">

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#17A9C9]/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      <div className="flex flex-col w-full max-w-6xl px-10 sm:px-16 py-12 relative z-10">

        {/* Logo + progress */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex flex-col gap-[3px] mb-6">
            <div className="flex gap-[3px]">
              <span className="w-2 h-2 rounded-[2px] bg-[#17A9C9]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#21e8ff]/40" />
            </div>
            <div className="flex gap-[3px]">
              <span className="w-2 h-2 rounded-[2px] bg-[#21e8ff]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#17A9C9]/60" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 w-6 rounded-full transition-all duration-500 ${i < step ? 'bg-[#21e8ff]' : 'bg-zinc-800'}`}
              />
            ))}
            <span className="text-[10px] text-zinc-600 font-mono ml-1">{step}/{totalSteps}</span>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-2 text-center">
          <h1 className="text-2xl font-bold font-display text-white leading-tight tracking-tight mb-1">
            Build your habit stack
          </h1>
          <p className="text-xs text-zinc-500">
            Pair a daily habit you already do with a vocal habit. Match at least {MIN_PAIRS} to continue.
          </p>
        </div>

        {/* Instruction hint */}
        <div className="flex items-center justify-center gap-2 mb-6 mt-3">
          <div className="h-px flex-1 bg-zinc-800/60" />
          <span className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase px-2">
            {pendingDaily
              ? `Now pick a vocal habit to pair with "${DAILY_HABITS.find(h => h.id === pendingDaily)?.label}"`
              : 'Select a daily habit first'}
          </span>
          <div className="h-px flex-1 bg-zinc-800/60" />
        </div>

        {/* Two columns, circles wrap within each */}
        <div className="grid grid-cols-2 gap-14 mb-6">
          {/* Daily habits */}
          <div>
            <span
              className="text-[9px] font-mono uppercase tracking-widest block mb-3 text-center transition-all duration-300"
              style={!pendingDaily ? {
                color: 'rgba(33,232,255,0.9)',
                textShadow: '0 0 12px rgba(33,232,255,0.5), 0 0 24px rgba(33,232,255,0.2)',
              } : {
                color: 'rgba(255,255,255,0.2)',
                textShadow: 'none',
              }}
            >Daily Habits</span>
            <div className="max-h-[340px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-3 gap-6 px-4 py-4">
                {DAILY_HABITS.map((habit, i) => {
                  const isPaired = pairedDailyIds.has(habit.id);
                  const isPending = pendingDaily === habit.id;
                  return (
                    <motion.button
                      key={habit.id}
                      onClick={() => handleDailyClick(habit.id)}
                      initial={{ opacity: 0, scale: 0.6, y: 10 }}
                      animate={{ opacity: isPaired ? 0.35 : 1, scale: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                      whileHover={!isPaired ? { scale: 1.07 } : {}}
                      whileTap={!isPaired ? { scale: 0.94 } : {}}
                      disabled={isPaired}
                      className="flex flex-col items-center justify-center gap-2 w-[130px] h-[130px] rounded-full transition-all duration-200 cursor-pointer disabled:cursor-default select-none"
                      style={isPending ? {
                        background: 'linear-gradient(135deg, rgba(33,232,255,0.18) 0%, rgba(33,232,255,0.06) 100%)',
                        border: '1.5px solid rgba(33,232,255,0.6)',
                        boxShadow: '0 0 28px rgba(33,232,255,0.18), 0 0 10px rgba(33,232,255,0.1)',
                      } : isPaired ? {
                        background: 'rgba(19,22,28,0.6)',
                        border: '1px solid rgba(39,39,42,0.4)',
                      } : {
                        background: 'rgba(28,33,42,0.9)',
                        border: '1px solid rgba(82,82,91,0.55)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                      }}
                    >
                      <span className="text-2xl leading-none" style={{ filter: isPending ? 'drop-shadow(0 0 8px rgba(33,232,255,0.5))' : 'none' }}>
                        {habit.emoji}
                      </span>
                      <span className="text-[9px] font-light text-center leading-tight px-2 transition-colors duration-200" style={{ color: isPending ? '#e4e4e7' : '#a1a1aa' }}>
                        {habit.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vocal habits */}
          <div>
            <span
              className="text-[9px] font-mono uppercase tracking-widest block mb-3 text-center transition-all duration-300"
              style={pendingDaily ? {
                color: 'rgba(96,165,250,0.9)',
                textShadow: '0 0 12px rgba(59,130,246,0.5), 0 0 24px rgba(37,99,235,0.2)',
              } : {
                color: 'rgba(255,255,255,0.2)',
                textShadow: 'none',
              }}
            >Vocal Habits</span>
            <div className="max-h-[340px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-3 gap-6 px-4 py-4">
                {VOCAL_HABITS.map((habit, i) => {
                  const isPaired = pairedVocalIds.has(habit.id);
                  const isClickable = !!pendingDaily && !isPaired;
                  return (
                    <motion.button
                      key={habit.id}
                      onClick={() => handleVocalClick(habit.id)}
                      initial={{ opacity: 0, scale: 0.6, y: 10 }}
                      animate={{ opacity: isPaired ? 0.35 : isClickable ? 1 : 0.5, scale: 1, y: 0 }}
                      transition={{ delay: i * 0.06 + 0.1, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                      whileHover={isClickable ? { scale: 1.07 } : {}}
                      whileTap={isClickable ? { scale: 0.94 } : {}}
                      disabled={isPaired || !pendingDaily}
                      className="flex flex-col items-center justify-center gap-2 w-[150px] h-[100px] rounded-full transition-all duration-200 select-none"
                      style={isPaired ? {
                        background: 'rgba(19,22,28,0.6)',
                        border: '1px solid rgba(37,99,235,0.15)',
                        cursor: 'default',
                      } : isClickable ? {
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.14) 0%, rgba(29,78,216,0.06) 100%)',
                        border: '1px solid rgba(59,130,246,0.45)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 0 16px rgba(37,99,235,0.15)',
                        cursor: 'pointer',
                      } : {
                        background: 'linear-gradient(135deg, rgba(30,64,175,0.25) 0%, rgba(29,78,216,0.12) 100%)',
                        border: '1px solid rgba(59,130,246,0.35)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 0 12px rgba(37,99,235,0.1)',
                        cursor: 'not-allowed',
                      }}
                    >
                      <span className="text-2xl leading-none" style={{ filter: isClickable ? 'drop-shadow(0 0 6px rgba(59,130,246,0.45))' : 'none' }}>{habit.emoji}</span>
                      <span className="text-[9px] font-light text-center leading-tight px-2" style={{ color: isClickable ? '#93c5fd' : '#52525b' }}>
                        {habit.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Paired habits */}
        <AnimatePresence>
          {value.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[9px] font-light uppercase tracking-widest text-zinc-600">Pairs</span>
                <div className="h-px flex-1 bg-zinc-800/40" />
                <span className="text-[9px] font-light tabular-nums" style={{ color: value.length >= MIN_PAIRS ? 'rgba(33,232,255,0.7)' : 'rgba(255,255,255,0.2)' }}>
                  {value.length}/{MIN_PAIRS}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <AnimatePresence>
                  {value.map((pair, i) => {
                    const daily = DAILY_HABITS.find(h => h.id === pair.daily);
                    const vocal = VOCAL_HABITS.find(h => h.id === pair.vocal);
                    return (
                      <motion.div
                        key={`${pair.daily}-${pair.vocal}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -16, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="relative flex items-center w-full px-5 py-3.5 rounded-[20px] overflow-hidden group cursor-default transition-all duration-200 hover:-translate-y-[2px]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(23,169,201,0.18) 0%, rgba(23,169,201,0.10) 100%)',
                          border: '1px solid rgba(33,232,255,0.18)',
                          boxShadow: '0 0 24px rgba(33,232,255,0.1), 0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(33,232,255,0.12)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(33,232,255,0.35)';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 28px rgba(33,232,255,0.18), 0 8px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(33,232,255,0.15)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(33,232,255,0.10)';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 24px rgba(33,232,255,0.07), 0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(33,232,255,0.08)';
                        }}
                      >
                        {/* Shine */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#21e8ff]/20 to-transparent pointer-events-none" />

                        {/* Content */}
                        <div className="flex items-center gap-2 relative z-10">
                          <span className="text-base leading-none">{daily?.emoji}</span>
                          <span className="text-[11px] font-semibold text-zinc-300">{daily?.label}</span>
                        </div>

                        <span className="text-[10px] text-zinc-600 mx-3 relative z-10">→</span>

                        <div className="flex items-center gap-2 relative z-10">
                          <span className="text-base leading-none">{vocal?.emoji}</span>
                          <span className="text-[11px] font-semibold text-zinc-300">{vocal?.label}</span>
                        </div>

                        <button
                          onClick={() => removePair(i)}
                          className="ml-auto w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all duration-150 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            onClick={onNext}
            disabled={!canContinue}
            className={`flex items-center justify-center gap-1.5 h-12 px-6 rounded-xl transition-all duration-300 group ${canContinue
              ? 'bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 shadow-[0_0_20px_rgba(23,169,201,0.12)] cursor-pointer'
              : 'bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed opacity-80'
              }`}
          >
            <span className={`text-[12px] tracking-widest uppercase font-medium transition-colors duration-300 ${canContinue ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-600 font-light'
              }`}>
              Continue
            </span>
            <ArrowRight className={`w-4 h-4 transition-colors duration-300 ${canContinue ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-700'}`} />
          </button>
        </div>

      </div>
    </div>
  );
}
