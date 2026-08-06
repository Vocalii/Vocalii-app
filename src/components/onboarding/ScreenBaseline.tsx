import React from 'react';
import BaselineFlow, { type BaselineMetrics } from '../BaselineFlow';
import OnboardingLogo from './OnboardingLogo';
import OnboardingStepProgress from './OnboardingStepProgress';

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
          <div className="mb-6">
            <OnboardingLogo />
          </div>
          <OnboardingStepProgress step={step} totalSteps={totalSteps} />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold font-display text-white leading-tight tracking-tight mb-1">
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
