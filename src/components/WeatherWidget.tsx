import React from 'react';
import { Destination } from '../types';

interface WeatherWidgetProps {
  destination: Destination;
}

export default function WeatherWidget({ destination }: WeatherWidgetProps) {
  // Determine stable breach likelihood data per destination so Santorini stays 52% exactly as screenshot
  const getBreachData = (id: string) => {
    switch (id) {
      case 'santorini':
        return { likelihood: 52, change: '+1.66', period: '1W', isIncrease: true };
      case 'kyoto':
        return { likelihood: 24, change: '-0.45', period: '1W', isIncrease: false };
      case 'capetown':
        return { likelihood: 78, change: '+3.12', period: '1W', isIncrease: true };
      case 'chamonix':
        return { likelihood: 31, change: '+0.15', period: '1W', isIncrease: true };
      case 'petra':
        return { likelihood: 45, change: '-1.10', period: '1W', isIncrease: false };
      default:
        // Hash destination id to generate stable values between 20 and 85
        let sum = 0;
        for (let i = 0; i < id.length; i++) {
          sum += id.charCodeAt(i);
        }
        const likelihood = 20 + (sum % 65);
        const changeVal = (0.1 + (sum % 15) / 10).toFixed(2);
        return {
          likelihood,
          change: `+${changeVal}`,
          period: '1W',
          isIncrease: true,
        };
    }
  };

  const { likelihood, change, period } = getBreachData(destination.id);

  // SVG parameters
  const radius = 64;
  const strokeWidth = 5;
  // Circumference of a complete circle with r=64 is 2 * pi * 64 ≈ 402.12
  // We only draw a semi-circle from left to right (180 degrees), so path or dasharray length is pi * 64 ≈ 201.06
  const strokeLength = Math.PI * radius; // 201.06
  // Express likelihood as a ratio
  const ratio = likelihood / 100;
  // Compute dashoffset so that the colored segment starts drawing from left to right
  const strokeDashoffset = strokeLength * (1 - ratio);

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] px-5 py-3.5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="weather-widget"
    >
      {/* Intense glowing ambient purple light gradient below the arc meter */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#554bf5]/30 rounded-full blur-[28px] pointer-events-none transition-all duration-500 group-hover:bg-[#554bf5]/45 group-hover:scale-110 z-0" />

      {/* Header Row: Title without icon */}
      <div className="flex items-center z-10 pl-0.5 pt-0.5">
        <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
          OMNI-Vocal Effort Score
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
            {/* Background Arch Overlay for subtle border depth */}
            <path
              d="M 16,80 A 64,64 0 0,1 144,80"
              fill="none"
              stroke="#34343a"
              strokeWidth={strokeWidth - 2}
              strokeLinecap="round"
              className="opacity-40"
            />
            {/* Glowing / Colored Progress Segment */}
            <path
              d="M 16,80 A 64,64 0 0,1 144,80"
              fill="none"
              stroke="url(#purpleGlowGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Gradient definition for exact graphics matching */}
            <defs>
              <linearGradient id="purpleGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3d37f1" />
                <stop offset="50%" stopColor="#554bf5" />
                <stop offset="100%" stopColor="#6961ff" />
              </linearGradient>
            </defs>
          </svg>

          {/* Core readout metrics */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end h-full">
            <div className="flex items-end justify-center gap-0.5 pb-1">
              <span className="text-[28px] font-light text-white tracking-tighter leading-none select-none font-sans">
                {Math.round(likelihood / 10)}
              </span>
              <span className="text-[9px] font-semibold text-zinc-400 mb-1 select-none font-sans">
                /10
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
