import { motion } from 'motion/react';
import type { VoiceFunctionSummary } from '../lib/sectionAnalysis';

const COLORS = { pitch: '#21e8ff', steadiness: '#818cf8', quality: '#a78bfa', volume: '#34d399' };

const TOOLTIPS = {
  pitch: 'Average fundamental frequency across your voice samples.',
  steadiness: 'Jitter / shimmer — how consistent your pitch and loudness stayed.',
  quality: 'Harmonics-to-noise ratio — how clear vs breathy your voice sounded.',
  volume: 'Average loudness relative to a calibrated baseline.',
};

function Circle({ value, unit, label, color, tooltip, small }: { value: string; unit: string; label: string; color: string; tooltip: string; small?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2.5 group">
      <motion.div
        whileHover={{ scale: 1.07 }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className="w-[92px] h-[92px] sm:w-[116px] sm:h-[116px] rounded-full flex items-center justify-center cursor-default relative"
        style={{
          background: `radial-gradient(circle at 38% 32%, ${color}20 0%, ${color}08 100%)`,
          border: `1px solid ${color}40`,
          boxShadow: `0 0 24px ${color}12`,
        }}
      >
        <div className="flex items-baseline gap-0.5 leading-none transition-opacity duration-150 group-hover:opacity-0" style={{ color, fontSize: small ? 15 : 26 }}>
          <span className="font-light tabular-nums">{value}</span>
          <small className="text-[11px] opacity-50">{unit}</small>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-3.5 pointer-events-none">
          <p className="text-[8px] font-mono text-center leading-relaxed" style={{ color: `${color}bb` }}>{tooltip}</p>
        </div>
      </motion.div>
      <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-500">{label}</span>
    </div>
  );
}

// Free-floating — no card shell. One session-wide number per metric instead of a per-step
// breakdown (see summarizeVoiceFunction in sectionAnalysis.ts), reusing the old acoustic score
// circle look.
export default function VoiceFunctionSection({ summary, detail }: { summary: VoiceFunctionSummary | null; detail?: boolean }) {
  if (!summary) return null;
  return (
    <div className="w-full flex flex-col gap-3.5">
      <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 text-center">Voice Function</span>
      <div className={`grid grid-cols-2 sm:grid-cols-4 justify-items-center ${detail ? 'gap-0' : 'gap-3'}`}>
        {summary.pitchHz != null && <Circle value={`${Math.round(summary.pitchHz)}`} unit="Hz" label="Pitch" color={COLORS.pitch} tooltip={TOOLTIPS.pitch} />}
        {(summary.jitterPercent != null || summary.shimmerPercent != null) && (
          <Circle
            value={`${summary.jitterPercent?.toFixed(2) ?? '—'}/${summary.shimmerPercent?.toFixed(2) ?? '—'}`}
            unit="%" label="Steadiness" color={COLORS.steadiness} tooltip={TOOLTIPS.steadiness} small
          />
        )}
        {summary.hnrDb != null && <Circle value={summary.hnrDb.toFixed(1)} unit="dB" label="Quality" color={COLORS.quality} tooltip={TOOLTIPS.quality} />}
        {summary.volumeDbfs != null && <Circle value={`${Math.round(summary.volumeDbfs)}`} unit="dBFS" label="Volume" color={COLORS.volume} tooltip={TOOLTIPS.volume} />}
      </div>
    </div>
  );
}
