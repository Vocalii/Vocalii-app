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

  const { total, status, alertColor } = getVocalFatigueData(destination.id);

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] p-5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col gap-5 h-auto relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="vocal-fatigue-index-panel"
    >
      {/* Dynamic ambient background glow in sleek neutral white / light zinc */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-72 h-24 bg-white/5 rounded-full blur-[32px] pointer-events-none transition-all duration-500 group-hover:bg-white/10 group-hover:scale-110 z-0" />

      {/* Top group: title + description */}
      <div className="flex flex-col gap-2.5 z-10">
        <div className="flex items-center justify-between w-full pl-0.5 pt-0.5">
          <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
            Voice Health Status
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-zinc-950/40 text-[#21e8ff]">
              Voice Readiness
            </span>
            <div className="flex items-baseline gap-0.5 bg-zinc-950/50 px-3.5 py-1.5 rounded-full shadow-inner">
              <span className="text-[18px] font-extrabold text-white tracking-tighter leading-none font-sans">
                {total}
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 font-sans">%</span>
            </div>
          </div>
        </div>

        <div className="text-[10.5px] text-zinc-400 pl-0.5 font-sans leading-relaxed">
          Reporting <span className="text-white font-semibold">tension</span> and <span className="text-white font-semibold">dryness</span> this week, with mild fatigue peaking mid-session. Consider reducing vocal load and increasing hydration.
        </div>
      </div>

      {/* Bar */}
      <div className="z-10 relative">
        <div className="w-full h-4 bg-zinc-950/80 rounded-full border border-zinc-800/80 relative overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${total}%`, background: 'linear-gradient(to right, #17A9C9, #21e8ff, #14b8a6, #8b5cf6, #a78bfa)', boxShadow: '0 0 8px rgba(167,139,250,0.2)' }}
          />
        </div>
      </div>

    </div>
  );
}
