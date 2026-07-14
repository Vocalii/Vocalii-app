import React from 'react';
import { motion } from 'motion/react';
import BaselineFlow, { type BaselineMetrics } from '../BaselineFlow';

interface Props {
  onNext: () => void;
  onBack: () => void;
  onBaseline?: (metrics: BaselineMetrics) => void;
  step: number;
  totalSteps: number;
}

export default function ScreenBaseline({ onNext, onBack: _onBack, onBaseline, step, totalSteps }: Props) {
  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center font-sans relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#17A9C9]/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      <div className="flex flex-col w-full max-w-lg px-4 sm:px-10 py-12 relative z-10">

        {/* Logo + progress */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex flex-col gap-[3px] mb-6">
            <div className="flex gap-[3px]">
              <span className="w-2 h-2 rounded-[2px] bg-[#17A9C9]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#21e8ff]/40" />
            </div>
            <div className="flex gap-[3px]">
              <span className="w-2 h-2 rounded-[2px] bg-[#21e8ff]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#17A9C9]/60" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-40 h-0.5 rounded-full overflow-hidden bg-zinc-800">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'linear-gradient(90deg, #17A9C9, #21e8ff, #17A9C9)' }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">{step}/{totalSteps}</span>
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-light font-display text-white leading-tight tracking-tight mb-1">
            Let's hear your voice
          </h1>
          <p className="text-xs text-zinc-500">
            Three short recordings to set your vocal baseline.
          </p>
        </div>

        <div
          className="rounded-[28px] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0f1319 0%, #0b0e14 100%)',
            border: '1px solid rgba(167,139,250,0.15)',
          }}
        >
          <BaselineFlow
            onComplete={(metrics) => { onBaseline?.(metrics); onNext(); }}
            onSkip={onNext}
          />
        </div>

      </div>
    </div>
  );
}
