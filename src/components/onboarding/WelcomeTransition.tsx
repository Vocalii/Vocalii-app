import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  firstName: string;
  onDone: () => void;
}

// How long each line stays fully visible before the next one takes over — the fade itself is
// handled by AnimatePresence's own enter/exit animation on top of this.
const HOLD_MS = 2400;
// A beat of held-empty screen before "Welcome, {name}" appears, so it doesn't pop in the instant
// this overlay mounts.
const START_DELAY_MS = 700;

// Plays "Welcome, {firstName}" then "Let's learn about you," each fading in/out in turn, then
// calls onDone — a pure animation beat between the intro video and the first onboarding
// question, not a navigable step of its own.
export default function WelcomeTransition({ firstName, onDone }: Props) {
  const [phase, setPhase] = useState<'idle' | 'welcome' | 'learn'>('idle');

  useEffect(() => {
    const toWelcome = setTimeout(() => setPhase('welcome'), START_DELAY_MS);
    return () => clearTimeout(toWelcome);
  }, []);

  useEffect(() => {
    if (phase !== 'welcome') return;
    const toLearn = setTimeout(() => setPhase('learn'), HOLD_MS);
    return () => clearTimeout(toLearn);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'learn') return;
    const finish = setTimeout(onDone, HOLD_MS);
    return () => clearTimeout(finish);
  }, [phase, onDone]);

  return (
    <div className="min-h-screen bg-[#090b0e] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#17A9C9]/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {phase !== 'idle' && (
          <motion.h1
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="text-3xl sm:text-4xl font-light font-display tracking-tight text-white text-center px-6 relative z-10"
          >
            {phase === 'welcome' ? `Welcome, ${firstName}` : "Let's learn about you"}
          </motion.h1>
        )}
      </AnimatePresence>
    </div>
  );
}
