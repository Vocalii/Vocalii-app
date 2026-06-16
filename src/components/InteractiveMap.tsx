import React from 'react';
import { Activity, Mic, Heart, HelpCircle, AlertCircle } from 'lucide-react';
import { Destination } from '../types';

interface InteractiveMapProps {
  destination: Destination;
  activeAttraction?: any; // Marked optional to maintain clean backward compatibility in App.tsx
  setActiveAttraction?: (attr: any) => void;
}

export default function InteractiveMap({
  destination,
}: InteractiveMapProps) {
  // Clinical data parser for Vocal Fatigue Index based on destination
  const getVocalFatigueData = (id: string) => {
    switch (id) {
      case 'santorini':
        return {
          total: 58,
          factor1: 24, // Phonatory Effort
          factor2: 20, // Physical Discomfort
          factor3: 14, // Voice Limitation
          status: 'Moderate Strain',
          alertColor: 'text-amber-400',
        };
      case 'kyoto':
        return {
          total: 28,
          factor1: 12,
          factor2: 10,
          factor3: 6,
          status: 'Excellent Capacity',
          alertColor: 'text-emerald-400',
        };
      case 'capetown':
        return {
          total: 76,
          factor1: 34,
          factor2: 26,
          factor3: 16,
          status: 'Elevated Fatigue Hazard',
          alertColor: 'text-rose-400',
        };
      case 'chamonix':
        return {
          total: 42,
          factor1: 18,
          factor2: 14,
          factor3: 10,
          status: 'Minor Overexertion',
          alertColor: 'text-amber-300',
        };
      case 'petra':
        return {
          total: 52,
          factor1: 22,
          factor2: 18,
          factor3: 12,
          status: 'Moderate Strain',
          alertColor: 'text-amber-400',
        };
      default:
        // Hash to create stable destination-specific figures
        let sum = 0;
        for (let i = 0; i < id.length; i++) {
          sum += id.charCodeAt(i);
        }
        const total = 30 + (sum % 48); // 30% to 78%
        const factor1 = Math.floor(total * 0.45);
        const factor2 = Math.floor(total * 0.35);
        const factor3 = total - factor1 - factor2;
        return {
          total,
          factor1,
          factor2,
          factor3,
          status: total > 60 ? 'Exertion Caution' : 'Healthy Reserve',
          alertColor: total > 60 ? 'text-rose-400' : 'text-emerald-400',
        };
    }
  };

  const { total, factor1, factor2, factor3, status, alertColor } = getVocalFatigueData(destination.id);
  const safeReserve = 100 - total;

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] p-6 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[260px] lg:h-full relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="vocal-fatigue-index-panel"
    >
      {/* Dynamic ambient background glow in sleek neutral white / light zinc */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-72 h-24 bg-white/5 rounded-full blur-[32px] pointer-events-none transition-all duration-500 group-hover:bg-white/10 group-hover:scale-110 z-0" />

      {/* Header Row matched exactly to the breach likelihood styling */}
      <div className="flex items-center justify-between z-10 w-full pl-0.5 pt-0.5">
        <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
          Vocal Fatigue Index
        </span>

        {/* Average score chip display in primary blue */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-zinc-950/40 text-[#21e8ff]">
            Average Score
          </span>
          <div className="flex items-baseline gap-0.5 bg-zinc-950/50 px-3.5 py-1.5 rounded-full shadow-inner">
            <span className="text-[18px] font-extrabold text-white tracking-tighter leading-none font-sans">
              {total}
            </span>
            <span className="text-[10px] font-semibold text-zinc-500 font-sans">%</span>
          </div>
        </div>
      </div>

      {/* Description Context Indicator */}
      <div className="text-[10.5px] text-zinc-400 pl-1 mt-1 z-10 font-sans leading-relaxed">
        Diagnoses voice strain profiles and capacity loss across active communication environments in <span className="text-white font-semibold">{destination.name}</span>.
      </div>

      {/* Central Visual Element: Thick horizontal multi-segment stacked bar */}
      <div className="mt-4 mb-2 z-10 relative">
        <div className="w-full h-4 bg-zinc-950/80 rounded-full border border-zinc-800/80 flex relative overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
          
          {/* Segment 1: Phonatory Effort */}
          <div 
            style={{ width: `${factor1}%` }}
            className="h-full bg-gradient-to-r from-[#17A9C9] to-[#21e8ff] relative group/seg cursor-pointer transition-all duration-700 ease-out"
          >
            <div className="opacity-0 group-hover/seg:opacity-100 transition-opacity duration-200 absolute -top-9 left-1/2 -translate-x-1/2 bg-[#0c0a0e]/95 border border-zinc-800/50 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] text-[#21e8ff] whitespace-nowrap shadow-xl z-30 pointer-events-none font-sans font-medium">
              Phonatory Strain: {factor1}%
            </div>
          </div>

          {/* Segment 2: Physical Discomfort */}
          <div 
            style={{ width: `${factor2}%` }}
            className="h-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6] relative group/seg2 cursor-pointer transition-all duration-700 ease-out border-l border-black/25"
          >
            <div className="opacity-0 group-hover/seg2:opacity-100 transition-opacity duration-200 absolute -top-9 left-1/2 -translate-x-1/2 bg-[#0c0a0e]/95 border border-zinc-800/50 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] text-[#2dd4bf] whitespace-nowrap shadow-xl z-30 pointer-events-none font-sans font-medium">
              Physical Discomfort: {factor2}%
            </div>
          </div>

          {/* Segment 3: Voice Limitation */}
          <div 
            style={{ width: `${factor3}%` }}
            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] relative group/seg3 cursor-pointer transition-all duration-700 ease-out border-l border-black/25"
          >
            <div className="opacity-0 group-hover/seg3:opacity-100 transition-opacity duration-200 absolute -top-9 left-1/2 -translate-x-1/2 bg-[#0c0a0e]/95 border border-zinc-800/50 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] text-[#c084fc] whitespace-nowrap shadow-xl z-30 pointer-events-none font-sans font-medium">
              Limitation Risk: {factor3}%
            </div>
          </div>

          {/* Segment 4: Safe Reserve capacity */}
          <div 
            style={{ width: `${safeReserve}%` }}
            className="h-full bg-white/5 hover:bg-white/10 relative group/seg4 cursor-pointer transition-all duration-700 ease-out border-l border-zinc-800/60"
          >
            <div className="opacity-0 group-hover/seg4:opacity-100 transition-opacity duration-200 absolute -top-9 left-1/2 -translate-x-1/2 bg-[#0c0a0e]/95 border border-zinc-800/50 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] text-emerald-400 whitespace-nowrap shadow-xl z-30 pointer-events-none font-sans font-medium">
              Safety Deck: {safeReserve}% reserve
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Legend at the bottom with solid color dots and titles */}
      <div className="flex items-center justify-start gap-4 z-10 w-full mt-0 px-1">
        
        {/* Factor 1 */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#17A9C9] flex-shrink-0" />
          <span className="text-[10px] font-medium text-zinc-400 font-sans">
            Phonatory Strain
          </span>
        </div>

        {/* Factor 2 */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] flex-shrink-0" />
          <span className="text-[10px] font-medium text-zinc-400 font-sans">
            Discomfort Rate
          </span>
        </div>

        {/* Factor 3 */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] flex-shrink-0" />
          <span className="text-[10px] font-medium text-zinc-400 font-sans">
            Recovery Speed
          </span>
        </div>

      </div>

    </div>
  );
}
