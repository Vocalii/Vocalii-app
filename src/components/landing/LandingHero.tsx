import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LandingDemoCard from './LandingDemoCard';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

// Cycles through, same phase-cycling pattern as WelcomeTransition.tsx (a phase + setTimeout +
// AnimatePresence cross-fade) — ~2s hold per phrase, matching that component's cadence.
const HEADLINE_SUFFIXES = ['Every Day', 'For Speeches', 'For Confidence', 'For Clarity'];
const HOLD_MS = 6000;

export default function LandingHero({ onGetStarted, onSignIn }: Props) {
  const [suffixIndex, setSuffixIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSuffixIndex(i => (i + 1) % HEADLINE_SUFFIXES.length);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div id="landing-hero-content" className="relative z-20 flex flex-col items-center text-center max-w-3xl mx-auto px-4 pt-4 sm:pt-8 md:pt-12">
      <LandingDemoCard />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="mb-5 sm:mb-6"
      >
        {/* drop-shadow glow adds visual weight/prominence without bumping the font weight. */}
        <h1
          className="text-xl sm:text-5xl md:text-6xl lg:text-[64px] font-normal font-display text-white tracking-tight leading-[1.1]"
          style={{ filter: 'drop-shadow(0 0 28px rgba(33,232,255,0.3))' }}
        >
          Your Voice, Coached{' '}
          <AnimatePresence mode="wait">
            <motion.span
              key={suffixIndex}
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
              className="inline-block text-[#21e8ff]"
            >
              {HEADLINE_SUFFIXES[suffixIndex]}
            </motion.span>
          </AnimatePresence>
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 24, delay: 0.35 }}
        className="text-zinc-300/85 text-sm sm:text-base md:text-lg max-w-2xl font-normal leading-relaxed mb-8 sm:mb-10 px-2"
      >
        AI-guided vocal rituals, daily check-ins, and real progress tracking, built for speakers,
        educators, and anyone who relies on their voice.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 130, damping: 22, delay: 0.65 }}
        className="flex flex-wrap items-center justify-center gap-3.5"
      >
        <button
          onClick={onGetStarted}
          className="flex items-center justify-center gap-1.5 h-12 px-7 sm:px-8 rounded-xl transition-all duration-300 group cursor-pointer bg-gradient-to-r from-[#0E7C96]/35 to-[#0E7C96]/15 hover:from-[#0E7C96]/45 hover:to-[#0E7C96]/20 border border-[#0E7C96]/70 hover:border-[#0E7C96]/90 shadow-[0_0_20px_rgba(14,124,150,0.16)]"
        >
          <span className="text-[12px] tracking-widest uppercase font-medium text-cyan-300 group-hover:text-[#21e8ff] transition-colors duration-300">
            Get Started
          </span>
          <ArrowRight className="w-4 h-4 text-cyan-300 group-hover:text-[#21e8ff] transition-colors duration-300" />
        </button>

      </motion.div>
    </div>
  );
}
