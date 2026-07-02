import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  desiredTraits: string[];
  onChangeDesiredTraits: (traits: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

// single color per trait for distinct selected states
const TRAIT_COLORS: Record<string, { primary: string; glow: string; border: string }> = {
  Confident: { primary: '#f59e0b', glow: 'rgba(245,158,11,0.22)', border: 'rgba(245,158,11,0.6)' },
  Calm: { primary: '#818cf8', glow: 'rgba(129,140,248,0.22)', border: 'rgba(129,140,248,0.6)' },
  Clear: { primary: '#21e8ff', glow: 'rgba(33,232,255,0.22)', border: 'rgba(33,232,255,0.6)' },
  Warm: { primary: '#f97316', glow: 'rgba(249,115,22,0.22)', border: 'rgba(249,115,22,0.6)' },
  Engaging: { primary: '#10b981', glow: 'rgba(16,185,129,0.22)', border: 'rgba(16,185,129,0.6)' },
};

const TRAITS: { label: string; subtitle: string; emoji: string; glowPos: React.CSSProperties }[] = [
  { label: 'Confident', subtitle: 'Impactful, powerful, authoritative', emoji: '💪', glowPos: { top: '5%', left: '5%' } },
  { label: 'Calm', subtitle: 'Calm, grounded, relaxed', emoji: '🧘', glowPos: { top: '5%', right: '5%' } },
  { label: 'Clear', subtitle: 'Clear, professional', emoji: '🎯', glowPos: { top: '50%', left: '0%' } },
  { label: 'Warm', subtitle: 'Warm, approachable, authentic', emoji: '☀️', glowPos: { top: '50%', right: '0%' } },
  { label: 'Engaging', subtitle: 'Energetic, dynamic', emoji: '⚡', glowPos: { bottom: '5%', left: '35%' } },
];

export default function ScreenVoiceTraits({ desiredTraits, onChangeDesiredTraits, onNext, onBack, step, totalSteps }: Props) {
  const select = (label: string) => {
    if (desiredTraits[0] === label) {
      onChangeDesiredTraits([]);
    } else {
      onChangeDesiredTraits([label]);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center font-sans relative overflow-hidden">

      {/* Static ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#17A9C9]/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      {/* Reactive glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {TRAITS.map(trait => desiredTraits.includes(trait.label) && (
            <motion.div
              key={trait.label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute w-[500px] h-[500px] rounded-full blur-[130px]"
              style={{ ...trait.glowPos, background: `radial-gradient(circle, ${TRAIT_COLORS[trait.label].glow} 0%, transparent 70%)` }}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col w-full max-w-2xl px-10 sm:px-16 py-12 relative z-10">

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
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-light font-display text-white leading-tight tracking-tight mb-1">
            How do you want to sound?
          </h1>
          <p className="text-xs text-zinc-500">
            Select the traits you want your voice to embody.
          </p>
        </div>

        {/* Trait circles */}
        <div className="flex flex-wrap justify-center gap-5">
          {TRAITS.map((trait, i) => {
            const selected = desiredTraits.includes(trait.label);
            return (
              <motion.button
                key={trait.label}
                onClick={() => select(trait.label)}
                initial={{ opacity: 0, scale: 0.6, y: 16 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -4, 0],
                }}
                transition={{
                  opacity: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
                  scale:   { delay: i * 0.08, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
                  y: {
                    delay: i * 0.08 + 0.5,
                    duration: 3.5 + i * 0.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                whileHover={{ scale: selected ? 1.05 : 1.1, transition: { duration: 0.12, ease: 'easeOut' } }}
                whileTap={{ scale: 0.95, transition: { duration: 0.08, ease: 'easeOut' } }}
                className="flex flex-col items-center justify-center gap-1.5 w-40 h-40 rounded-full border transition-colors duration-300 select-none cursor-pointer"
                style={selected ? {
                  background: `radial-gradient(circle at 40% 35%, ${TRAIT_COLORS[trait.label].glow} 0%, rgba(10,13,18,0.9) 70%)`,
                  borderColor: TRAIT_COLORS[trait.label].border,
                  boxShadow: `0 0 60px ${TRAIT_COLORS[trait.label].glow}, 0 0 24px ${TRAIT_COLORS[trait.label].glow}, inset 0 1px 0 ${TRAIT_COLORS[trait.label].border}`,
                } : {
                  background: 'rgba(19,22,28,0.8)',
                  borderColor: 'rgba(39,39,42,0.6)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <span
                  className="text-3xl"
                  style={{ filter: selected ? `drop-shadow(0 0 12px ${TRAIT_COLORS[trait.label].primary})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                >
                  {trait.emoji}
                </span>
                <span
                  className="text-[12px] font-semibold text-center leading-tight transition-colors duration-300"
                  style={{ color: selected ? TRAIT_COLORS[trait.label].primary : '#71717a' }}
                >
                  {trait.label}
                </span>
                <span
                  className="text-[9px] font-light text-center leading-tight px-4 transition-colors duration-300"
                  style={{ color: selected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)' }}
                >
                  {trait.subtitle}
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
            disabled={desiredTraits.length === 0}
            className={`flex items-center justify-center gap-1.5 h-12 px-6 rounded-xl transition-all duration-300 group ${desiredTraits.length > 0
              ? 'bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 shadow-[0_0_20px_rgba(23,169,201,0.12)] cursor-pointer'
              : 'bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed opacity-80'
              }`}
          >
            <span className={`text-[12px] tracking-widest uppercase font-medium transition-colors duration-300 ${desiredTraits.length > 0 ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-600 font-light'
              }`}>
              Continue
            </span>
            <ArrowRight className={`w-4 h-4 transition-colors duration-300 ${desiredTraits.length > 0 ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-700'}`} />
          </button>
        </div>

      </div>
    </div>
  );
}
