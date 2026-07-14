import React from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, Users, Mic, Briefcase, Video, MoreHorizontal, Music, HeartPulse } from 'lucide-react';
import { Role } from '../../types/onboarding';

interface Props {
  value: Role | null;
  onChange: (role: Role) => void;
  onNext: () => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

export const ROLES: { id: Role; label: string; subtitle: string; icon: React.ReactNode; color: string; glow: string; image: string }[] = [
  { id: 'teacher', label: 'Educator / Teacher', subtitle: 'K-12 teachers, university faculty, tutors, instructors.', icon: <GraduationCap className="w-5 h-5" />, color: '#a78bfa', glow: 'rgba(167,139,250,0.12)', image: '/assets/images/teacher.png' },
  { id: 'trainer', label: 'Corporate Trainer', subtitle: 'L&D professionals, trainers, workshop facilitators, instructional coaches.', icon: <Users className="w-5 h-5" />, color: '#f59e0b', glow: 'rgba(245,158,11,0.12)', image: '/assets/images/trainer.png' },
  { id: 'speaker', label: 'Speaker / Presenter', subtitle: 'Keynote speakers, presenters, moderators, emcees.', icon: <Mic className="w-5 h-5" />, color: '#f43f5e', glow: 'rgba(244,63,94,0.12)', image: '/assets/images/speaker.png' },
  { id: 'executive', label: 'Executive / Leader', subtitle: 'Managers, directors, founders, C-suite, team leads.', icon: <Briefcase className="w-5 h-5" />, color: '#6366f1', glow: 'rgba(99,102,241,0.12)', image: '/assets/images/executive.png' },
  { id: 'creator', label: 'Content Creator / Coach', subtitle: 'YouTubers, podcasters, online educators, coaches, consultants.', icon: <Video className="w-5 h-5" />, color: '#10b981', glow: 'rgba(16,185,129,0.12)', image: '/assets/images/creator.png' },
  { id: 'singer', label: 'Singer / Performer', subtitle: 'Singers, actors, voice-over artists, performers.', icon: <Music className="w-5 h-5" />, color: '#f97316', glow: 'rgba(249,115,22,0.12)', image: '/assets/images/singer.png' },
  { id: 'therapy', label: 'Voice Therapy / Rehab', subtitle: 'Rebuilding or supporting your voice after injury, illness, surgery, or therapy.', icon: <HeartPulse className="w-5 h-5" />, color: '#17A9C9', glow: 'rgba(23,169,201,0.12)', image: '/assets/images/therapy.png' },
  { id: 'other', label: 'Other', subtitle: '', icon: <MoreHorizontal className="w-5 h-5" />, color: '#94a3b8', glow: 'rgba(148,163,184,0.12)', image: '/assets/images/other.png' },
];

export default function ScreenRole({ value, onChange, onNext, onBack, step, totalSteps }: Props) {
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
        <div className="mb-6">
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
        <div className="mb-6">
          <h1 className="text-2xl font-light font-display text-white leading-tight tracking-tight mb-1">
            Role
          </h1>
          <p className="text-xs text-zinc-500">
            How do you use your voice most?
          </p>
        </div>

        {/* Role cards — 2-column grid */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {ROLES.map(role => {
            const selected = value === role.id;
            return (
              <button
                key={role.id}
                onClick={() => onChange(role.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-200 select-none cursor-pointer ${!selected ? 'bg-[#13161c] hover:bg-[#1c2028]' : ''}`}
                style={selected ? {
                  background: `linear-gradient(135deg, ${role.color}18 0%, ${role.color}08 100%)`,
                  borderColor: `${role.color}50`,
                  boxShadow: `0 0 24px ${role.color}20, inset 0 1px 0 ${role.color}20`,
                } : {
                  borderColor: 'rgba(39,39,42,0.8)',
                }}
              >
                <div className="flex-shrink-0 transition-colors duration-200" style={{ color: selected ? role.color : '#71717a' }}>
                  {role.icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12.5px] font-medium leading-tight transition-colors duration-200" style={{ color: selected ? '#fff' : '#d4d4d8' }}>
                    {role.label}
                  </span>
                  {role.subtitle && (
                    <span className="text-[10px] leading-snug mt-0.5 line-clamp-2" style={{ color: selected ? `${role.color}99` : '#52525b' }}>
                      {role.subtitle}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 flex-shrink-0"
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
            <span className={`text-[12px] tracking-widest uppercase font-medium transition-colors duration-300 ${value ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-600 font-light'}`}>
              Continue
            </span>
            <ArrowRight className={`w-4 h-4 transition-colors duration-300 ${value ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-700'}`} />
          </button>
        </div>

      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:block lg:w-[32%] relative overflow-hidden">
        <img
          src={ROLES.filter(r => r.id === value)?.[0]?.image}
          alt="placeholder"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090b0e] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

    </div>
  );
}
