import { Check, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

// A small "real product" glimpse floating near the headline — reuses WeatherWidget.tsx's actual
// dark-card visual language (rounded-[28px], gradient bg, cyan ambient glow) at a smaller scale,
// rather than another abstract icon+label node. Hidden below lg so it never collides with the
// headline on narrower viewports. `.animate-float` is the same CSS keyframe already defined in
// src/index.css and used elsewhere in the app.
export default function LandingDemoCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 110, damping: 20, delay: 1.9 }}
      className="hidden lg:block absolute -bottom-16   -right-16 xl:-right-28 z-20 pointer-events-none"
    >
      <div className="animate-float" style={{ animationDelay: '0.4s' }}>
        <div
          className="w-[190px] bg-[#181b22] border border-zinc-800/80 rounded-[24px] px-4 py-3.5 shadow-[0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur-[12px] relative overflow-hidden select-none"
        >
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-40 h-16 rounded-full blur-[24px] pointer-events-none" style={{ background: 'rgba(23,169,201,0.3)' }} />

          <div className="flex items-center gap-1.5 mb-2.5 relative z-10">
            <span className="text-[9px] font-light uppercase tracking-widest text-zinc-400">Today's Ritual</span>
          </div>

          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}>
              <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={3} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold text-zinc-200 leading-tight truncate">Vocal Warm-Up</span>
              <span className="text-[10px] text-zinc-500 font-light">3 min · Complete</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
