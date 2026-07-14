import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface BaselineMetricValues {
  stabilityPct: number | null;
  resonanceScore: number | null;
  clarityPct: number | null;
  loudnessDb: number | null;
  pitchHz: number | null;
  pitchRangeHz: number | null;
}

interface BaselineCardProps {
  baseline: BaselineMetricValues;
  recent: BaselineMetricValues;
}

const METRICS: { key: keyof BaselineMetricValues; label: string; unit: string; barMin: number; barMax: number; color: string }[] = [
  { key: 'stabilityPct', label: 'Stability', unit: '%', barMin: 0, barMax: 100, color: '#22d3ee' },
  { key: 'resonanceScore', label: 'Resonance', unit: '', barMin: 0, barMax: 100, color: '#fbbf24' },
  { key: 'clarityPct', label: 'Clarity', unit: '%', barMin: 0, barMax: 100, color: '#34d399' },
  { key: 'loudnessDb', label: 'Loudness', unit: 'dB', barMin: 40, barMax: 90, color: '#f472b6' },
  { key: 'pitchHz', label: 'Pitch', unit: 'Hz', barMin: 80, barMax: 300, color: '#21e8ff' },
  { key: 'pitchRangeHz', label: 'Pitch range', unit: 'Hz', barMin: 0, barMax: 150, color: '#a78bfa' },
];

const AUTOPLAY_INTERVAL_MS = 4000;

const barPct = (value: number, min: number, max: number) => Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

export default function BaselineCard({ baseline, recent }: BaselineCardProps) {
  const slides = useMemo(() => {
    return METRICS
      .map(m => {
        const baselineValue = baseline[m.key];
        if (baselineValue == null) return null;
        const recentValue = recent[m.key] ?? baselineValue;
        const delta = recentValue - baselineValue;
        return { ...m, baselineValue, recentValue, delta };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);
  }, [baseline, recent]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex(i => (i + 1) % slides.length), AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const active = slides[index];

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] px-5 py-4 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="baseline-comparison-widget"
    >
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-16 bg-[#10b981]/15 rounded-full blur-[28px] pointer-events-none z-0" />

      <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans z-10">Baseline Comparison</span>

      {!active ? (
        <div className="flex items-center justify-center z-10 flex-1">
          <span className="text-[10px] text-zinc-600 font-mono tracking-wide text-center leading-relaxed">
            Record a baseline audio<br />to compare
          </span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={active.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="flex flex-col gap-2 z-10">
              {[
                { label: 'Baseline', value: active.baselineValue, glow: false },
                { label: 'Recent', value: active.recentValue, glow: true },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2.5">
                  <span className="text-[9px] font-mono w-11 shrink-0" style={{ color: row.glow ? active.color : `${active.color}90` }}>{row.label}</span>
                  <div className="flex-1 h-[6px] rounded-full bg-zinc-800/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${barPct(row.value, active.barMin, active.barMax)}%`,
                        background: row.glow ? active.color : `${active.color}70`,
                        boxShadow: row.glow ? `0 0 6px ${active.color}80` : 'none',
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-mono w-9 text-right" style={{ color: row.glow ? active.color : `${active.color}90` }}>
                    {Math.round(row.value)}{active.unit}
                  </span>
                </div>
              ))}
            </div>

            <span className="text-[9px] font-mono text-zinc-600 z-10 mt-2 block">
              {active.label} ·{' '}
              {Math.round(active.delta) !== 0 ? (
                <span className={active.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {active.delta > 0 ? '+' : ''}{Math.round(active.delta)}{active.unit} since baseline
                </span>
              ) : (
                <span className="text-zinc-500">no change since baseline</span>
              )}
            </span>
          </motion.div>
        </AnimatePresence>
      )}

      {slides.length > 1 && (
        <div className="flex items-center gap-1 justify-center z-10 mt-1">
          {slides.map((s, i) => (
            <span
              key={s.key}
              className="h-1 rounded-full transition-all duration-300"
              style={{ width: i === index ? '12px' : '4px', background: i === index ? active?.color : 'rgba(255,255,255,0.15)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
