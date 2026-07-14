import { ArrowLeft, ArrowRight, Zap, Shield, Wind, Pencil, LucideIcon } from 'lucide-react';
import { VoiceIdentity } from '../../types/onboarding';

interface Props {
  value: VoiceIdentity | null;
  customIdentity: string;
  onChange: (identity: VoiceIdentity) => void;
  onCustomChange: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

export const IDENTITIES: { id: VoiceIdentity; label: string; description: string; icon: LucideIcon }[] = [
  {
    id: 'vocal_athlete',
    label: 'Vocal Athlete',
    description: 'Train my voice like a performance instrument — strong, precise, enduring.',
    icon: Zap,
  },
  {
    id: 'confident_leader',
    label: 'Confident Leader',
    description: 'Command rooms, inspire teams, and project authority naturally.',
    icon: Shield,
  },
  {
    id: 'calm_commanding',
    label: 'Calm Yet Commanding',
    description: 'Communicate with ease, warmth, and quiet authority — without strain.',
    icon: Wind,
  },
  {
    id: 'custom',
    label: 'Define my own',
    description: 'I have a specific vision for who I want to become as a communicator.',
    icon: Pencil,
  },
];

const SELECTED_STYLE = {
  background: 'linear-gradient(135deg, rgba(33,232,255,0.12) 0%, rgba(33,232,255,0.05) 100%)',
  borderColor: 'rgba(33,232,255,0.4)',
  boxShadow: '0 0 24px rgba(33,232,255,0.1), inset 0 1px 0 rgba(33,232,255,0.15)',
};

const UNSELECTED_STYLE = {
  background: '#13161c',
  borderColor: 'rgba(39,39,42,0.8)',
};

const canAdvance = (value: VoiceIdentity | null, customIdentity: string) =>
  value !== null && (value !== 'custom' || customIdentity.trim().length > 0);

export default function ScreenIdentity({ value, customIdentity, onChange, onCustomChange, onNext, onBack, step, totalSteps }: Props) {
  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-stretch font-sans overflow-hidden">

      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#17A9C9]/8 blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[120px] pointer-events-none" />

      {/* LEFT PANEL */}
      <div className="flex flex-col w-full lg:w-[68%] px-10 sm:px-16 py-12 relative z-10">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="flex flex-col gap-[3px]">
            <div className="flex gap-[3px]">
              <span className="w-2 h-2 rounded-[2px] bg-[#17A9C9]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#21e8ff]/40" />
            </div>
            <div className="flex gap-[3px]">
              <span className="w-2 h-2 rounded-[2px] bg-[#21e8ff]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#17A9C9]/60" />
            </div>
          </div>
          <span className="text-sm font-semibold text-zinc-300 tracking-tight font-display">Vocalii</span>
        </div>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center gap-1 mb-1.5">
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display text-white leading-tight tracking-tight mb-1">
            Who do you want to become?
          </h1>
          <p className="text-xs text-zinc-500">
            Choose the communicator identity that resonates most with you.
          </p>
        </div>

        {/* Identity cards */}
        <div className="flex-1 flex flex-col gap-3">
          {IDENTITIES.map(identity => {
            const selected = value === identity.id;
            return (
              <button
                key={identity.id}
                onClick={() => onChange(identity.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-200 select-none cursor-pointer ${!selected ? 'bg-[#13161c] hover:bg-[#1c2028]' : ''}`}
                style={selected ? SELECTED_STYLE : { borderColor: 'rgba(39,39,42,0.8)' }}
              >
                <div className={`flex-shrink-0 transition-colors duration-200 ${selected ? 'text-[#21e8ff]' : 'text-zinc-600'}`}>
                  <identity.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className={`text-sm font-medium transition-colors duration-200 ${selected ? 'text-white' : 'text-zinc-300'}`}>
                    {identity.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{identity.description}</p>
                </div>
              </button>
            );
          })}

          {value === 'custom' && (
            <input
              type="text"
              placeholder="Describe the communicator you want to become..."
              value={customIdentity}
              onChange={e => onCustomChange(e.target.value)}
              autoFocus
              className="w-full bg-zinc-900/60 border border-[#21e8ff]/30 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#21e8ff]/60 transition-all duration-200"
            />
          )}
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
            disabled={!canAdvance(value, customIdentity)}
            className={`flex items-center justify-center gap-1.5 h-12 px-6 rounded-xl transition-all duration-300 group ${
              canAdvance(value, customIdentity)
                ? 'bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 shadow-[0_0_20px_rgba(23,169,201,0.12)] cursor-pointer'
                : 'bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed opacity-80'
            }`}
          >
            <span className={`text-[12px] tracking-widest uppercase font-medium transition-colors duration-300 ${
              canAdvance(value, customIdentity) ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-600 font-light'
            }`}>
              Continue
            </span>
            <ArrowRight className={`w-4 h-4 transition-colors duration-300 ${canAdvance(value, customIdentity) ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-700'}`} />
          </button>
        </div>

      </div>


      {/* RIGHT PANEL */}
      <div className="hidden lg:block lg:w-[32%] relative overflow-hidden">
        <img
          src="/src/assets/images/cod_ghost_operator_1780463136031.png"
          alt="placeholder"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090b0e] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

    </div>
  );
}
