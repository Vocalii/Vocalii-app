import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Goal } from '../../types/onboarding';

interface Props {
  value: Goal[];
  onChange: (goals: Goal[]) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

const GOALS: { id: Goal; label: string; emoji: string; glowPos: React.CSSProperties }[] = [
  { id: 'reduce_strain', label: 'Reduce strain', emoji: '🫁', glowPos: { top: '5%', left: '5%' } },
  { id: 'build_endurance', label: 'Build endurance', emoji: '💪', glowPos: { top: '5%', right: '5%' } },
  { id: 'improve_clarity', label: 'Improve clarity', emoji: '🎯', glowPos: { top: '45%', left: '0%' } },
  { id: 'own_my_voice', label: 'Own my voice', emoji: '🎤', glowPos: { top: '45%', right: '0%' } },
  { id: 'calm_my_nerves', label: 'Calm my nerves', emoji: '🧘', glowPos: { bottom: '5%', left: '5%' } },
  { id: 'sound_confident', label: 'Sound more confident', emoji: '✨', glowPos: { bottom: '5%', right: '5%' } },
];

export default function ScreenGoals({ value, onChange, onNext, onBack, step, totalSteps }: Props) {
  const toggle = (goal: Goal) => {
    if (value.includes(goal)) {
      onChange(value.filter(g => g !== goal));
    } else if (value.length < 3) {
      onChange([...value, goal]);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center font-sans relative overflow-hidden">

      {/* Static ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#17A9C9]/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      {/* Reactive glow blobs — one per selected goal */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {GOALS.map(goal => value.includes(goal.id) && (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute w-[400px] h-[400px] rounded-full blur-[120px]"
              style={{ ...goal.glowPos, background: 'radial-gradient(circle, rgba(33,232,255,0.07) 0%, transparent 70%)' }}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col w-full max-w-2xl px-10 sm:px-16 py-12 relative z-10">

        {/* Logo + progress — centered */}
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

        {/* Heading — centered */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-light font-display text-white leading-tight tracking-tight mb-1">
            What brings you here?
          </h1>
          <p className="text-xs text-zinc-500">
            Select everything that applies — you can have more than one goal.
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            Select up to 3.
          </p>
        </div>

        {/* Goal cards — entrance + floating circles */}
        <div className="flex flex-wrap justify-center gap-5">
          {GOALS.map((goal, i) => {
            const selected = value.includes(goal.id);
            return (
              <motion.button
                key={goal.id}
                onClick={() => toggle(goal.id)}
                // Entrance
                initial={{ opacity: 0, scale: 0.6, y: 16 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -4, 0],
                }}
                transition={{
                  opacity: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
                  scale: { delay: i * 0.08, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
                  y: {
                    delay: i * 0.08 + 0.5,
                    duration: 3.5 + i * 0.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                whileHover={{ scale: 1.1, transition: { duration: 0.12, ease: 'easeOut' } }}
                whileTap={{ scale: 0.95, transition: { duration: 0.08, ease: 'easeOut' } }}
                className="flex flex-col items-center justify-center gap-2 w-36 h-36 rounded-full border transition-colors duration-300 select-none cursor-pointer"
                style={selected ? {
                  background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(33,232,255,0.05) 100%)',
                  borderColor: 'rgba(33,232,255,0.45)',
                  boxShadow: '0 0 48px rgba(33,232,255,0.15), 0 0 16px rgba(33,232,255,0.1), inset 0 1px 0 rgba(33,232,255,0.2)',
                } : {
                  background: 'rgba(19,22,28,0.8)',
                  borderColor: 'rgba(39,39,42,0.6)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <span
                  className="text-3xl"
                  style={{ filter: selected ? 'drop-shadow(0 0 10px rgba(33,232,255,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                >
                  {goal.emoji}
                </span>
                <span
                  className="text-[11px] font-medium text-center leading-tight px-3 transition-colors duration-300 group-hover:text-zinc-200"
                  style={{ color: selected ? '#e4e4e7' : '#52525b' }}
                >
                  {goal.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            onClick={onNext}
            disabled={value.length === 0}
            className={`flex items-center justify-center gap-1.5 h-12 px-6 rounded-xl transition-all duration-300 group ${value.length > 0
                ? 'bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 shadow-[0_0_20px_rgba(23,169,201,0.12)] cursor-pointer'
                : 'bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed opacity-80'
              }`}
          >
            <span className={`text-[12px] tracking-widest uppercase font-medium transition-colors duration-300 ${value.length > 0 ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-600 font-light'
              }`}>
              Continue
            </span>
            <ArrowRight className={`w-4 h-4 transition-colors duration-300 ${value.length > 0 ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-700'}`} />
          </button>
        </div>

      </div>
    </div>
  );
}
