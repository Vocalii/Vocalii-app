import type { SpeechPerformanceSummary } from '../lib/sectionAnalysis';

const ACCENT = '#21e8ff';

// `insight`: the real AI-written speech-performance insight (VocalReport.insight), shown once a
// report is saved and reloaded. Not available yet on the live save screen (it's only generated at
// save time), where this falls back to a local, deterministic sentence from the raw numbers —
// same pattern as ExpressiveDeliverySection's describeBands. Same glow box the old stats pill used.
export default function SpeechPerformanceStats({ summary, insight }: { summary: SpeechPerformanceSummary; insight?: string }) {
  const sentence = insight ?? (summary.matchPct != null
    ? `You averaged ${summary.wpm} words per minute across sections, with a ${summary.matchPct}% match to target phrases.`
    : `You averaged ${summary.wpm} words per minute across sections.`);
  return (
    <div
      className="relative rounded-2xl px-4 py-4"
      style={{
        background: `radial-gradient(circle at 25% 20%, ${ACCENT}1c 0%, ${ACCENT}08 100%)`,
        border: `1px solid ${ACCENT}40`,
        boxShadow: `0 0 24px ${ACCENT}10, inset 0 0 16px ${ACCENT}08`,
      }}
    >
      <p className="text-[12px] font-light text-zinc-300 leading-relaxed text-left">{sentence}</p>
    </div>
  );
}
