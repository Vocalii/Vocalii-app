import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Destination } from '../types';

const TARGET_CONFIDENCE = 4;
const TARGET_EFFORT = 3; // matches goalProgress.ts's reduce_strain target — lower is better
const AUTOPLAY_INTERVAL_MS = 6000;

interface WeatherWidgetProps {
  destination: Destination;
  confidence?: number | null;
  baselineConfidence?: number | null;
  vocalEffort?: number | null;
}

type Face = 'confidence' | 'effort';

// Same arc-gauge chrome for both faces — only the metric, scale, and target differ. Effort has no
// baseline to trend against yet, so its trend row simply doesn't render (same as confidence would
// with no baseline), rather than inventing tracking that doesn't exist elsewhere in the app.
export default function WeatherWidget({ destination: _destination, confidence, baselineConfidence, vocalEffort }: WeatherWidgetProps) {
  const [face, setFace] = useState<Face>('confidence');

  useEffect(() => {
    const id = setInterval(() => {
      setFace(f => (f === 'confidence' ? 'effort' : 'confidence'));
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const value = face === 'confidence' ? confidence : vocalEffort;
  const scaleMax = face === 'confidence' ? 5 : 10;
  const target = face === 'confidence' ? TARGET_CONFIDENCE : TARGET_EFFORT;
  const title = face === 'confidence' ? 'OMNI-Voice Confidence' : 'OMNI-Vocal Effort';

  const radius = 64;
  const strokeWidth = 5;
  const strokeLength = Math.PI * radius;
  const strokeDashoffset = value != null ? strokeLength * (1 - value / scaleMax) : strokeLength;

  const diff = face === 'confidence' && confidence != null && baselineConfidence != null
    ? confidence - baselineConfidence
    : null;
  const TrendIcon = diff == null || Math.abs(diff) < 0.05 ? Minus : diff > 0 ? ArrowUp : ArrowDown;
  const trendColor = diff == null || Math.abs(diff) < 0.05 ? '#71717a' : diff > 0 ? '#34d399' : '#f87171';

  const gradientId = face === 'effort' ? 'orangeGlowGrad' : 'purpleGlowGrad';
  const ambientColor = face === 'effort' ? '#f59e0b' : '#554bf5';

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] px-5 py-3.5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="weather-widget"
    >
      {/* Intense glowing ambient light gradient below the arc meter — purple for confidence, orange for effort */}
      <div
        className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 rounded-full blur-[28px] pointer-events-none transition-all duration-500 group-hover:scale-110 z-0"
        style={{ background: `${ambientColor}4d` }}
      />
      <div
        className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 rounded-full blur-[28px] pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100 group-hover:scale-110 z-0"
        style={{ background: `${ambientColor}73` }}
      />

      {/* Header Row: Title + trend vs. baseline */}
      <div className="flex items-center justify-between z-10 pl-0.5 pt-0.5 gap-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={title}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium tracking-tight text-neutral-300 font-sans"
          >
            {title}
          </motion.span>
        </AnimatePresence>
        {diff != null && (
          <span
            className="flex items-center gap-1 text-[11px] font-bold flex-shrink-0 font-sans"
            style={{ color: trendColor, filter: `drop-shadow(0 0 6px ${trendColor}80)` }}
          >
            <TrendIcon className="w-3.5 h-3.5" strokeWidth={3} />
            {Math.abs(diff) < 0.05 ? 'On par' : `${Math.abs(diff).toFixed(1)} pts ${diff > 0 ? 'up' : 'down'}`}
          </span>
        )}
      </div>

      {/* Arc Meter or empty state */}
      <AnimatePresence mode="wait">
        {value != null ? (
          <motion.div
            key={face}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative flex flex-col items-center justify-center select-none z-10 pb-0.5"
          >
            <div className="relative w-[160px] h-[68px] overflow-hidden flex items-end justify-center mb-1">
              <svg className="absolute top-0 left-0 w-[160px] h-[80px]" viewBox="0 0 160 80">
                <path d="M 16,80 A 64,64 0 0,1 144,80" fill="none" stroke="#2a2a2f" strokeWidth={strokeWidth} strokeLinecap="round" />
                <path d="M 16,80 A 64,64 0 0,1 144,80" fill="none" stroke="#34343a" strokeWidth={strokeWidth - 2} strokeLinecap="round" className="opacity-40" />
                <path
                  d="M 16,80 A 64,64 0 0,1 144,80"
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={strokeLength}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="purpleGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3d37f1" />
                    <stop offset="50%" stopColor="#554bf5" />
                    <stop offset="100%" stopColor="#6961ff" />
                  </linearGradient>
                  <linearGradient id="orangeGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end h-full">
                <div className="flex items-end justify-center gap-0.5 pb-1">
                  <span className="text-[28px] font-light text-white tracking-tighter leading-none select-none font-sans">{value}</span>
                  <span className="text-[9px] font-semibold text-zinc-400 mb-1 select-none font-sans">/{scaleMax}</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 font-sans">
              Target: <span className="text-zinc-300 font-medium">{face === 'effort' ? `≤${target}` : target}/{scaleMax}</span>
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center z-10 flex-1"
          >
            <span className="text-[10px] text-zinc-600 font-mono tracking-wide">Complete daily check-in</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
