import React from 'react';
import { Destination } from '../types';

interface AcousticWidgetProps {
  destination: Destination;
}

export default function AcousticWidget({ destination }: AcousticWidgetProps) {
  // Let's generate a stable Acoustic Clarity rating based on the destination name length & characters
  const getClarityData = (id: string) => {
    switch (id) {
      case 'santorini':
        return { rating: 88, label: 'Excellent Reverb', subtitle: 'Open-air clarity' };
      case 'kyoto':
        return { rating: 92, label: 'Superb Resonance', subtitle: 'Wooden acoustic warmth' };
      case 'capetown':
        return { rating: 74, label: 'Good Presence', subtitle: 'Coastal ambient' };
      case 'chamonix':
        return { rating: 65, label: 'High Absorption', subtitle: 'Soft mountain snow' };
      case 'petra':
        return { rating: 96, label: 'Canyon Echo', subtitle: 'Natural stone amphitheater' };
      default:
        let sum = 0;
        for (let i = 0; i < id.length; i++) {
          sum += id.charCodeAt(i);
        }
        const rating = 60 + (sum % 38);
        const label = rating >= 85 ? 'Exceptional Ambient' : rating >= 75 ? 'Very Warm Presence' : 'Standard Clarity';
        return { rating, label, subtitle: 'Standard ambient' };
    }
  };

  const { rating, label } = getClarityData(destination.id);

  // SVG parameters
  const radius = 64;
  const strokeWidth = 5;
  const strokeLength = Math.PI * radius; // 201.06
  const ratio = rating / 100;
  const strokeDashoffset = strokeLength * (1 - ratio);

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] px-5 py-3.5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="acoustic-variance-widget"
    >
      {/* Intense glowing ambient cyan/teal light gradient below the arc meter */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#06b6d4]/20 rounded-full blur-[28px] pointer-events-none transition-all duration-500 group-hover:bg-[#06b6d4]/30 group-hover:scale-110 z-0" />

      {/* Header Row: Title */}
      <div className="flex items-center z-10 pl-0.5 pt-0.5">
        <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
          Acoustic Resonance
        </span>
      </div>

      {/* Arc Meter and Values Container */}
      <div className="relative flex flex-col items-center justify-center select-none z-10 pb-0.5">
        {/* Semi-circular gauge */}
        <div className="relative w-[160px] h-[68px] overflow-hidden flex items-end justify-center">
          <svg className="absolute top-0 left-0 w-[160px] h-[80px]" viewBox="0 0 160 80">
            {/* Background Arch Track */}
            <path
              d="M 16,80 A 64,64 0 0,1 144,80"
              fill="none"
              stroke="#2a2a2f"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Background Arch Overlay */}
            <path
              d="M 16,80 A 64,64 0 0,1 144,80"
              fill="none"
              stroke="#34343a"
              strokeWidth={strokeWidth - 2}
              strokeLinecap="round"
              className="opacity-40"
            />
            {/* Colored Progress Segment */}
            <path
              d="M 16,80 A 64,64 0 0,1 144,80"
              fill="none"
              stroke="url(#cyanGlowGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="cyanGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
          </svg>

          {/* Core readout metrics: Percentage with % superscript */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end h-full pb-0.5">
            <div className="flex items-start justify-center relative translate-y-3.5 select-none">
              <span className="text-[32px] font-bold text-white tracking-tighter leading-none select-none font-sans">
                {rating}
              </span>
              <span className="text-[9px] font-semibold text-zinc-400 -mt-0.5 select-none font-sans">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Change Rate / Condition readout */}
        <div className="text-[11px] mt-2 flex items-center justify-center gap-1.5 font-sans">
          <span className="text-cyan-400 font-semibold tracking-tight">
            {label}
          </span>
          <span className="text-zinc-500 font-medium">
            Clarity
          </span>
        </div>
      </div>
    </div>
  );
}
