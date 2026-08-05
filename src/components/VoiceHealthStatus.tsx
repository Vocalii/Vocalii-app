import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import { Destination } from '../types';
import { calculateVoiceReadiness } from '../lib/voiceReadiness';
import { EXERCISE_RITUALS } from '../ritualsData';

interface VocalData {
  effortScore: number | null;
  demandLevel: number | null;
  checkInDone: boolean;
  symptoms?: string[];
}

interface InteractiveMapProps {
  destination: Destination;
  activeAttraction?: any;
  setActiveAttraction?: (attr: any) => void;
  vocalData?: VocalData;
  dailyRitualIds?: string[];
  completedRitualIds?: string[];
  isPrepActive?: boolean;
  onNavigateRituals?: () => void;
}

const LABEL_STYLES: Record<string, { color: string; bg: string; border: string; fill: string }> = {
  'Voice Ready': { color: 'text-[#21e8ff]', bg: 'bg-[#21e8ff]/10', border: 'border-[#21e8ff]/20', fill: '#21e8ff' },
  'Steady': { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', fill: '#a78bfa' },
  'Needs Support': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', fill: '#60a5fa' },
  'Rest & Recover': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', fill: '#f87171' },
};

function getEffortLevel(score: number): 'Low' | 'Medium' | 'High' {
  if (score <= 3) return 'Low';
  if (score <= 7) return 'Medium';
  return 'High';
}

function getDemandLevel(score: number): 'Low' | 'Medium' | 'High' {
  if (score <= 2) return 'Low';
  if (score <= 3) return 'Medium';
  return 'High';
}

const LABEL_DESCRIPTIONS: Record<string, string> = {
  'Voice Ready': 'Your voice is in peak condition today. Keep up the excellent habits.',
  'Steady': 'Your voice is performing well. Maintain your current routine.',
  'Needs Support': 'Your voice could use some attention today. Consider lighter vocal demands and staying hydrated.',
  'Rest & Recover': 'Your voice is showing signs of strain. Prioritize rest and minimal vocal use today.',
};

export default function InteractiveMap({ vocalData, dailyRitualIds, completedRitualIds, isPrepActive, onNavigateRituals }: InteractiveMapProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const checkInDone = vocalData?.checkInDone ?? false;
  const hasRealData = checkInDone && vocalData?.effortScore != null;

  const result = hasRealData
    ? calculateVoiceReadiness({
      effort_score: vocalData!.effortScore!,
      demand_score: vocalData!.demandLevel ?? 3,
      symptoms: vocalData?.symptoms ?? [],
    })
    : null;

  const style = result ? (LABEL_STYLES[result.label] ?? LABEL_STYLES['Steady']) : null;

  const nextRitualId = dailyRitualIds?.find(id => !completedRitualIds?.includes(id));
  const nextRitual = nextRitualId ? EXERCISE_RITUALS.find(r => r.id === nextRitualId) : null;
  const allRitualsDone = !!dailyRitualIds?.length && !nextRitual;

  return (
    <>
      <div
        className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] p-6 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col gap-5 h-auto relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
        id="vocal-fatigue-index-panel"
      >
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-72 h-24 bg-white/5 rounded-full blur-[32px] pointer-events-none transition-all duration-500 group-hover:bg-white/10 group-hover:scale-110 z-0" />

        {/* Header row */}
        <div className="flex flex-col gap-2.5 z-10">
          <div className="flex items-center justify-between w-full pl-0.5 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
                Today's Voice Check-In
              </span>
              <button
                onClick={() => setHelpOpen(true)}
                className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all duration-150 cursor-pointer flex-shrink-0"
                aria-label="How is this score calculated?"
              >
                <span className="text-[9px] font-bold leading-none">?</span>
              </button>
            </div>
            {result && style && (
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${style.bg} ${style.border} ${style.color}`}>
                  {result.label}
                </span>
              </div>
            )}
          </div>

          <div className="text-[10.5px] text-zinc-400 pl-0.5 font-sans leading-relaxed">
            {result
              ? LABEL_DESCRIPTIONS[result.label]
              : <span>Complete your <span className="text-white font-semibold">daily check-in</span> to get a personalized Sustainable Voice Status.</span>
            }
          </div>
        </div>

        {/* Score bar — single gradient spanning the full track; score% reveals how far along. Hidden until a check-in exists. */}
        {result && (
          <div className="z-10 relative">
            <div className="w-full h-2 bg-zinc-950/80 rounded-full border border-zinc-800/80 relative overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              {/* Full-width gradient track, clipped by the fill div */}
              <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #7c3aed, #3b82f6, #17A9C9, #21e8ff)' }} />
              {/* Mask: covers the unfilled portion from the right */}
              <div
                className="absolute top-0 bottom-0 right-0 bg-zinc-950/80 transition-all duration-700 ease-out"
                style={{ left: `${result.score}%` }}
              />
              {/* Glow on the leading edge */}
              <div
                className="absolute top-0 bottom-0 w-2 -translate-x-1/2 blur-[3px] transition-all duration-700 ease-out"
                style={{ left: `${result.score}%`, background: 'rgba(33,232,255,0.1)' }}
              />
            </div>
          </div>
        )}

        {/* Factor breakdown — hidden until a check-in exists */}
        {result && style && (
          <div className="z-10 flex items-start gap-0 divide-x divide-zinc-800/60">
            {[
              { label: 'Effort', value: getEffortLevel(vocalData!.effortScore!) },
              { label: 'Demand', value: getDemandLevel(vocalData!.demandLevel ?? 3) },
              { label: 'Symptoms', value: vocalData?.symptoms?.length ? vocalData.symptoms.join(', ') : 'None Reported' },
            ].map(({ label, value }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-0.5 px-2 first:pl-0 last:pr-0">
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-sans">{label}</span>
                <span className="text-[11px] font-medium text-center leading-snug text-white">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next recommended ritual */}
        {checkInDone && (nextRitual || allRitualsDone) && (
          <button
            onClick={onNavigateRituals}
            className={`z-10 relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all duration-200 cursor-pointer group/next text-left border ${isPrepActive
              ? 'border-[#3b82f6]/25 bg-[#3b82f6]/5 hover:bg-[#3b82f6]/10 hover:border-[#60a5fa]/40'
              : 'border-white/[0.08] bg-white/[0.03] hover:bg-[#17A9C9]/10 hover:border-[#17A9C9]/40'
              }`}
          >
            {allRitualsDone ? (
              <span className="text-[11px] text-zinc-400 font-sans">All daily rituals complete — nice work.</span>
            ) : (
              <>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className={`text-[9px] text-zinc-600 uppercase tracking-wider font-sans transition-colors duration-200 ${isPrepActive ? 'group-hover/next:text-[#60a5fa]' : 'group-hover/next:text-[#21e8ff]'}`}>Recommended Ritual</span>
                  <span className="text-[12px] font-medium text-white truncate font-sans">{nextRitual!.name}</span>
                </div>
                <Play className={`w-3 h-3 fill-current opacity-80 flex-shrink-0 transition-all duration-200 group-hover/next:scale-110 ${isPrepActive ? 'group-hover/next:text-[#60a5fa]' : 'group-hover/next:text-[#21e8ff]'}`} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Help modal */}
      {helpOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setHelpOpen(false)}>
          <div
            className="relative max-w-sm w-full rounded-[28px] p-6 flex flex-col gap-5"
            style={{
              background: 'linear-gradient(to bottom, rgba(20,24,32,1) 0%, rgba(13,14,17,1) 100%)',
              border: '1px solid rgba(33,232,255,0.15)',
              boxShadow: '0 0 40px rgba(23,169,201,0.08), 0 20px 60px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px] bg-gradient-to-r from-transparent via-[#21e8ff]/20 to-transparent" />

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[14px] font-semibold text-white tracking-tight">How Your Score Works</h3>
                <p className="text-[10px] text-zinc-500">Updates every time you complete a check-in</p>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="w-7 h-7 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-all cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { label: 'Vocal Effort', pct: '35%', desc: 'How hard your voice is working today. Lower effort = higher score.' },
                { label: 'Vocal Demand', pct: '35%', desc: 'How much you used your voice today. Lower demand = higher score.' },
                { label: 'Symptoms', pct: '30%', desc: 'Any symptoms you\'re experiencing (hoarseness, dryness, etc.). Fewer symptoms = higher score.' },
              ].map(({ label, pct, desc }) => (
                <div key={label} className="flex gap-3 items-start">
                  <span className="text-[10px] font-bold text-[#21e8ff] bg-[#17A9C9]/10 border border-[#17A9C9]/20 rounded-md px-2 py-1 flex-shrink-0 w-10 text-center">{pct}</span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-zinc-200">{label}</span>
                    <span className="text-[10px] text-zinc-500 leading-relaxed">{desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/60">
              <p className="text-[10px] text-zinc-500">Score thresholds</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { range: '85–100', label: 'Voice Ready', color: 'text-[#21e8ff]' },
                  { range: '70–84', label: 'Steady', color: 'text-violet-400' },
                  { range: '50–69', label: 'Needs Support', color: 'text-blue-400' },
                  { range: '0–49', label: 'Rest & Recover', color: 'text-red-400' },
                ].map(({ range, label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-600 font-mono w-12">{range}</span>
                    <span className={`text-[10px] font-medium ${color}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
