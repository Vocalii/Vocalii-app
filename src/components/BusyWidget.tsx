import React from 'react';
import { Destination } from '../types';

interface BusyWidgetProps {
  destination: Destination;
}

export default function BusyWidget({ destination }: BusyWidgetProps) {
  // Get active crowd percentage
  const activeMonthData = destination.monthlyBusy.find(m => m.isActive) || destination.monthlyBusy[0];
  const busyPercentage = activeMonthData.value;

  // Determine busy text label based on percent
  let busyLabel = 'Not too busy';
  if (busyPercentage >= 90) {
    busyLabel = 'Refined Peak';
  } else if (busyPercentage >= 70) {
    busyLabel = 'Moderately Busy';
  } else if (busyPercentage >= 50) {
    busyLabel = 'Steady Crowd';
  }

  // SVG parameters
  const radius = 64;
  const strokeWidth = 5;
  const strokeLength = Math.PI * radius; // 201.06
  const ratio = busyPercentage / 100;
  const strokeDashoffset = strokeLength * (1 - ratio);

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] px-5 py-3.5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="crowd-congestion-widget"
    >
      {/* Intense glowing ambient amber light gradient below the arc meter */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#f59e0b]/20 rounded-full blur-[28px] pointer-events-none transition-all duration-500 group-hover:bg-[#f59e0b]/30 group-hover:scale-110 z-0" />

      {/* Header Row: Title without icon */}
      <div className="flex items-center z-10 pl-0.5 pt-0.5">
        <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
          Day Streak
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
              stroke="url(#amberGlowGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="amberGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fcd34d" />
              </linearGradient>
            </defs>
          </svg>

          {/* Core readout metrics: Percentage with % superscript */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end h-full pb-0.5">
            <div className="flex items-start justify-center relative translate-y-3.5 select-none">
              <span className="text-[32px] font-bold text-white tracking-tighter leading-none select-none font-sans">
                {busyPercentage}
              </span>
              <span className="text-[9px] font-semibold text-zinc-400 -mt-0.5 select-none font-sans">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Change Rate readout: e.g. Peak Season in Aug */}
        <div className="text-[11px] mt-2 flex items-center justify-center gap-1.5 font-sans">
          <span className="text-amber-400 font-semibold tracking-tight">
            {busyLabel}
          </span>
          <span className="text-zinc-500 font-medium">
            in {destination.activeMonth || 'Peak'}
          </span>
        </div>
      </div>
    </div>
  );
}
