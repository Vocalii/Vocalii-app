import React from 'react';
import { Destination } from '../types';

interface PriceWidgetProps {
  destination: Destination;
}

export default function PriceWidget({ destination }: PriceWidgetProps) {
  // Determine stable price index percentage so Santorini has a realistic premium feeling
  const getPriceIndexData = (id: string) => {
    switch (id) {
      case 'santorini':
        return { index: 86, change: '+2.4%', period: '1W' };
      case 'kyoto':
        return { index: 68, change: '+1.1%', period: '1W' };
      case 'capetown':
        return { index: 42, change: '-0.5%', period: '1W' };
      case 'chamonix':
        return { index: 75, change: '+1.8%', period: '1W' };
      case 'petra':
        return { index: 54, change: '-1.2%', period: '1W' };
      default:
        // Hash destination id to generate stable values between 40 and 80
        let sum = 0;
        for (let i = 0; i < id.length; i++) {
          sum += id.charCodeAt(i);
        }
        const index = 40 + (sum % 40);
        return {
          index,
          change: '+0.5%',
          period: '1W',
        };
    }
  };

  const { index: priceIndex, change, period } = getPriceIndexData(destination.id);

  // SVG parameters
  const radius = 64;
  const strokeWidth = 5;
  const strokeLength = Math.PI * radius; // 201.06
  const ratio = priceIndex / 100;
  const strokeDashoffset = strokeLength * (1 - ratio);

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] px-5 py-3.5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="price-trend-widget"
    >
      {/* Intense glowing ambient green/mint light gradient below the arc meter */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#10b981]/25 rounded-full blur-[28px] pointer-events-none transition-all duration-500 group-hover:bg-[#10b981]/35 group-hover:scale-110 z-0" />

      {/* Header Row: Title without icon */}
      <div className="flex items-center z-10 pl-0.5 pt-0.5">
        <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
          Voice Breaks
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
              stroke="url(#emeraldGlowGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="emeraldGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#6ee7b7" />
              </linearGradient>
            </defs>
          </svg>

          {/* Core readout metrics: Score with % superscript */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end h-full pb-0.5">
            <div className="flex items-start justify-center relative translate-y-3.5 select-none">
              <span className="text-[32px] font-bold text-white tracking-tighter leading-none select-none font-sans">
                {priceIndex}
              </span>
              <span className="text-[9px] font-semibold text-zinc-400 -mt-0.5 select-none font-sans">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Price range display & trend readout */}
        <div className="text-[11px] mt-2 flex items-center justify-center gap-1.5 font-sans">
          <span className="text-emerald-400 font-semibold tracking-tight">
            ${destination.basePriceMin.toLocaleString()} - ${destination.basePriceMax.toLocaleString()}
          </span>
          <span className="text-zinc-500 font-medium text-[10px]">
            {change} {period}
          </span>
        </div>
      </div>
    </div>
  );
}
