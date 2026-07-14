import React from 'react';
import { ArrowLeft, ArrowRight, Sprout, Flame, Star } from 'lucide-react';
import { ExperienceLevel } from '../../types/onboarding';

interface Props {
  value: ExperienceLevel | null;
  onChange: (level: ExperienceLevel) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

export const LEVELS: { id: ExperienceLevel; label: string; description: string; icon: React.ReactNode; image: string }[] = [
  {
    id: 'beginner',
    label: 'New to Voice Care',
    description: "I have little or no experience with vocal exercises or voice training.",
    icon: <Sprout className="w-6 h-6" />,
    image: '/src/assets/images/new.png',
  },
  {
    id: 'some_experience',
    label: 'Some Voice Awareness',
    description: "I’ve tried voice exercises, read about voice care, or noticed patterns in my voice.",
    icon: <Flame className="w-6 h-6" />,
    image: '/src/assets/images/medium.png',
  },
  {
    id: 'trained',
    label: "Experienced / Trained Voice User",
    description: "I’ve worked with an SLP, voice coach, singing teacher, or completed formal voice training.",
    icon: <Star className="w-6 h-6" />,
    image: '/src/assets/images/expert.png',
  },
];

export default function ScreenExperience({ value, onChange, onNext, onBack, step, totalSteps }: Props) {
  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-stretch font-sans overflow-hidden">

      {/* Ambient glows */}
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

        {/* Step progress */}
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
          <h1 className="text-2xl font-light font-display text-white leading-tight tracking-tight mb-1">
            Experience Level
          </h1>
          <p className="text-xs text-zinc-500">
            How familiar are you with voice care?
          </p>
        </div>

        {/* Level cards */}
        <div className="flex-1 flex flex-col gap-3">
          {LEVELS.map(level => {
            const selected = value === level.id;
            return (
              <button
                key={level.id}
                onClick={() => onChange(level.id)}
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
                  {level.icon}
                </div>
                <div>
                  <p className={`text-sm font-medium transition-colors duration-200 ${selected ? 'text-white' : 'text-zinc-300'}`}>
                    {level.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{level.description}</p>
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

      {/* RIGHT PANEL */}
      <div className="hidden lg:block lg:w-[32%] relative overflow-hidden">
        <img
          src={LEVELS.filter(l => l.id === value)?.[0]?.image}
          alt="placeholder"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090b0e] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

    </div>
  );
}
