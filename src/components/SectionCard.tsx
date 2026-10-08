import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface SectionCardProps {
  label: string;
  accent: string;
  primary: string;
  detail: string;
  tooltip?: string;
  // One entry per recording when a section allowed multiple attempts (see "Try another prompt" in
  // VoiceAnalyzerPage.tsx) — omitted or length <= 1 renders exactly as before, no chevron.
  attempts?: { prompt: string; score: string }[];
}

// Shared by VoiceAnalyzerPage.tsx's in-session results screen and ReportsPage.tsx's saved-report
// detail view — one card per recorded section (Sustained Vowel / Tongue Twisters / Read Aloud /
// Free Speech), replacing the old single-number CircleMetric now that each section surfaces two
// plain, literally-true measurements instead of one acoustic score. Same dark/glassy/accent-glow
// visual language as the circles it replaces, just wide enough to hold both values.
export default function SectionCard({ label, accent, primary, detail, tooltip, attempts }: SectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasAttempts = (attempts?.length ?? 0) > 1;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 22 } } }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      className="relative rounded-2xl px-4 py-4 flex flex-col gap-1.5 cursor-default group"
      style={{
        background: `radial-gradient(circle at 25% 20%, ${accent}1c 0%, ${accent}08 100%)`,
        border: `1px solid ${accent}40`,
        boxShadow: `0 0 24px ${accent}10, inset 0 0 16px ${accent}08`,
      }}
      title={tooltip}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">{label}</span>
        {hasAttempts && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center justify-center w-5 h-5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors duration-150 cursor-pointer"
            aria-label={expanded ? 'Hide individual attempts' : 'Show individual attempts'}
            title={expanded ? 'Hide individual attempts' : 'Show individual attempts'}
          >
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      <span className="text-[18px] sm:text-[20px] font-light tabular-nums" style={{ color: accent }}>{primary}</span>
      <span className="text-[10px] sm:text-[11px] font-mono" style={{ color: `${accent}90` }}>{detail}</span>
      {hasAttempts && expanded && (
        <div className="flex flex-col gap-1 mt-1 pt-2" style={{ borderTop: `1px solid ${accent}20` }}>
          {attempts!.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-[9px] font-mono text-zinc-500">
              <span className="truncate">{i + 1}. {a.prompt}</span>
              <span className="shrink-0" style={{ color: `${accent}90` }}>{a.score}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
