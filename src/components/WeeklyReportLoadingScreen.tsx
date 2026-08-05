import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

interface Props {
  onDone: () => void;
}

const COMPILE_STEPS = [
  'Compiling daily check-ins…',
  'Analyzing ritual history…',
  'Calculating goal trends…',
  'Building your report…',
];

export default function WeeklyReportLoadingScreen({ onDone }: Props) {
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(100, p + 1));
    }, 70);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 100) return;
    setComplete(true);
    const timeout = setTimeout(onDone, 1100);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const stepIndex = Math.min(COMPILE_STEPS.length - 1, Math.floor((progress / 100) * COMPILE_STEPS.length));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 px-6"
      style={{ background: 'rgba(5,6,9,0.96)', backdropFilter: 'blur(20px)' }}
    >
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(23,169,201,0.12) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center relative z-10"
          style={{ background: 'rgba(23,169,201,0.08)', border: '1px solid rgba(33,232,255,0.2)' }}
        >
          <AnimatePresence mode="wait">
            {complete ? (
              <motion.div
                key="check"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Check className="w-9 h-9 text-emerald-400" />
              </motion.div>
            ) : (
              <motion.span
                key="pct"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-mono text-[#21e8ff] tabular-nums"
              >
                {progress}%
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col items-center gap-4">
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: complete ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #0e7490, #17A9C9)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.15, ease: 'linear' }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={complete ? 'complete' : stepIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className={`text-[11px] font-mono tracking-[0.18em] uppercase ${complete ? 'text-emerald-400' : 'text-zinc-500'}`}
          >
            {complete ? 'Complete' : COMPILE_STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
