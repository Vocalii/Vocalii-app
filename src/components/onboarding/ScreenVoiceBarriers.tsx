import { ArrowLeft, ArrowRight, Clock, HeartCrack, BatteryLow } from 'lucide-react';
import { VoiceBarrier } from '../../types/onboarding';

interface Props {
  value: VoiceBarrier | null;
  onChange: (barrier: VoiceBarrier) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

export const CLUSTERS: { id: VoiceBarrier; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'time_consistency',
    label: 'Time & Consistency',
    description: "I forget to do voice exercises, I don't have time, or I lose motivation.",
    icon: <Clock className="w-6 h-6" />,
  },
  {
    id: 'confidence_identity',
    label: 'Confidence & Identity',
    description: "It doesn't sound like me, I feel self-conscious practicing, or I'm not sure what to do.",
    icon: <HeartCrack className="w-6 h-6" />,
  },
  {
    id: 'physical_demands',
    label: 'Physical Demands',
    description: 'My voice gets tired quickly, my workday is vocally demanding, or I push through instead of resting.',
    icon: <BatteryLow className="w-6 h-6" />,
  },
];

export default function ScreenVoiceBarriers({ value, onChange, onNext, onBack, step, totalSteps }: Props) {
  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center font-sans relative overflow-hidden">

      {/* Static ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#17A9C9]/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      <div className="flex flex-col w-full max-w-xl px-10 sm:px-16 py-12 relative z-10">

        {/* Logo + progress */}
        <div className="flex flex-col items-center mb-10">
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

          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 w-6 rounded-full transition-all duration-500 ${i < step ? 'bg-[#21e8ff]' : 'bg-zinc-800'}`}
              />
            ))}
            <span className="text-[10px] text-zinc-600 font-mono ml-1">{step}/{totalSteps}</span>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-light font-display text-white leading-tight tracking-tight mb-1">
            What makes it hard to care for or use your voice the way you want?
          </h1>
          <p className="text-xs text-zinc-500">
            Choose what resonates most.
          </p>
        </div>

        {/* Cluster cards */}
        <div className="flex flex-col gap-3">
          {CLUSTERS.map(cluster => {
            const selected = value === cluster.id;
            return (
              <button
                key={cluster.id}
                onClick={() => onChange(cluster.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-200 select-none cursor-pointer ${!selected ? 'bg-[#13161c] hover:bg-[#1c2028]' : ''}`}
                style={selected ? {
                  background: 'linear-gradient(135deg, rgba(33,232,255,0.12) 0%, rgba(33,232,255,0.05) 100%)',
                  borderColor: 'rgba(33,232,255,0.4)',
                  boxShadow: '0 0 24px rgba(33,232,255,0.1), inset 0 1px 0 rgba(33,232,255,0.15)',
                } : {
                  borderColor: 'rgba(39,39,42,0.8)',
                }}
              >
                <div className={`flex-shrink-0 transition-colors duration-200 ${selected ? 'text-[#21e8ff]' : 'text-zinc-600'}`}>
                  {cluster.icon}
                </div>
                <div>
                  <p className={`text-sm font-medium transition-colors duration-200 ${selected ? 'text-white' : 'text-zinc-300'}`}>
                    {cluster.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{cluster.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            onClick={onNext}
            disabled={!value}
            className={`flex items-center justify-center gap-1.5 h-12 px-6 rounded-xl transition-all duration-300 group ${value
                ? 'bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 shadow-[0_0_20px_rgba(23,169,201,0.12)] cursor-pointer'
                : 'bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed opacity-80'
              }`}
          >
            <span className={`text-[12px] tracking-widest uppercase font-medium transition-colors duration-300 ${value ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-600 font-light'
              }`}>
              Continue
            </span>
            <ArrowRight className={`w-4 h-4 transition-colors duration-300 ${value ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-700'}`} />
          </button>
        </div>

      </div>
    </div>
  );
}
