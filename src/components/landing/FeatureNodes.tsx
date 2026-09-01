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

const POSITION_CLASSES: Record<string, string> = {
  'top-left': 'top-[28%] left-[4%] sm:left-[8%] lg:left-[10%]',
  'bottom-left': 'bottom-[32%] left-[4%] sm:left-[6%] lg:left-[8%]',
  'top-right': 'top-[28%] right-[4%] sm:right-[8%] lg:right-[12%]',
  'bottom-right': 'bottom-[32%] right-[4%] sm:right-[6%] lg:right-[9%]',
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
            <div className={`flex items-center gap-3 animate-float ${isRight ? 'flex-row-reverse' : ''}`} style={{ animationDelay: `${i * 0.6}s` }}>
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#141820]/90 border border-[#17A9C9]/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-black/60">
                  <feature.Icon className="w-3.5 h-3.5 text-[#21e8ff]" />
                </div>
                <div className="absolute -inset-1 rounded-full bg-[#17A9C9]/10 blur-sm -z-10" />
              </div>
              <div className={`flex flex-col ${isRight ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/95 tracking-wide ${isRight ? 'justify-end' : ''}`}>
                  <span>{feature.label}</span>
                </div>
                <span className={`text-[10px] sm:text-xs text-zinc-400 font-sans ${isRight ? 'pr-3' : 'pl-3'}`}>{feature.sub}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
