import { Sparkles, Activity, ClipboardList, Mic } from 'lucide-react';
import { motion } from 'motion/react';

// Floating feature callouts around the hero — ported from the AI Studio prototype's AssetNodes
// (fake crypto assets with made-up numeric values), replaced with real Vocalii features and a
// short descriptor instead of a fabricated number.
const FEATURES = [
  { id: 'rituals', label: 'Daily Rituals', sub: 'Personalized', Icon: Sparkles, position: 'top-left' as const },
  { id: 'analyzer', label: 'Voice Analyzer', sub: 'Real acoustic data', Icon: Activity, position: 'bottom-left' as const },
  { id: 'coaching', label: 'AI Coaching', sub: 'Tailored guidance', Icon: Mic, position: 'top-right' as const },
  { id: 'reports', label: 'Weekly Reports', sub: 'Track your progress', Icon: ClipboardList, position: 'bottom-right' as const },
];

// Mobile positions are staggered per-node (rather than mirrored pairs) so the four callouts read as
// scattered around the headline instead of snapped to a symmetric grid.
const POSITION_CLASSES: Record<string, string> = {
  'top-left': 'top-[27%] left-[8%] sm:top-[28%] sm:left-[8%] lg:left-[10%]',
  'bottom-left': 'bottom-[24%] left-[6%] sm:bottom-[32%] sm:left-[6%] lg:left-[8%]',
  'top-right': 'top-[25%] right-[6%] sm:top-[28%] sm:right-[8%] lg:right-[12%]',
  'bottom-right': 'bottom-[20%] right-[2%] sm:bottom-[32%] sm:right-[6%] lg:right-[9%]',
};

export default function FeatureNodes() {
  return (
    <div id="feature-nodes-container" className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      <motion.svg
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        className="absolute inset-0 w-full h-full text-[#21e8ff]/10"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <path d="M 120 280 L 170 280 L 220 230 L 320 230" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="opacity-40 hidden md:block" />
        <path d="M 50 280 L 130 280" stroke="currentColor" strokeWidth="1" className="opacity-60 hidden md:block" />
        <path d="M 50 580 L 98 580 L 150 580 L 220 620 L 300 620" stroke="currentColor" strokeWidth="1" className="opacity-50 hidden md:block" />
        <path d="M 1150 270 L 980 270 L 920 240 L 850 240" stroke="currentColor" strokeWidth="1" className="opacity-50 hidden md:block" />
        <path d="M 1150 580 L 1020 580 L 950 580 L 880 620 L 820 620" stroke="currentColor" strokeWidth="1" className="opacity-40 hidden md:block" />
      </motion.svg>

      {FEATURES.map((feature, i) => {
        const isRight = feature.position.endsWith('right');
        return (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 130, damping: 20, delay: 0.5 + i * 0.35 }}
            className={`absolute ${POSITION_CLASSES[feature.position]}`}
          >
            <div className={`flex items-center gap-2 sm:gap-3 animate-float ${isRight ? 'flex-row-reverse' : ''}`} style={{ animationDelay: `${i * 0.6}s` }}>
              <div className="relative">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#141820]/90 border border-[#17A9C9]/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-black/60">
                  <feature.Icon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#21e8ff]" />
                </div>
                <div className="absolute -inset-1 rounded-full bg-[#17A9C9]/10 blur-sm -z-10" />
              </div>
              <div className={`flex flex-col ${isRight ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-center gap-1.5 text-[10px] sm:text-sm font-medium text-white/95 tracking-wide ${isRight ? 'justify-end' : ''}`}>
                  <span>{feature.label}</span>
                </div>
                <span className={`text-[8px] sm:text-xs text-zinc-400 font-sans ${isRight ? 'pr-2 sm:pr-3' : 'pl-2 sm:pl-3'}`}>{feature.sub}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
