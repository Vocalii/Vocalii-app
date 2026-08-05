import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Destination } from '../types';

const TARGET_CONFIDENCE = 4;

interface WeatherWidgetProps {
  destination: Destination;
  confidence?: number | null;
  baselineConfidence?: number | null;
}

export default function WeatherWidget({ destination: _destination, confidence, baselineConfidence }: WeatherWidgetProps) {
  const radius = 64;
  const strokeWidth = 5;
  const strokeLength = Math.PI * radius;
  const strokeDashoffset = confidence != null ? strokeLength * (1 - confidence / 5) : strokeLength;

  const diff = confidence != null && baselineConfidence != null ? confidence - baselineConfidence : null;
  const TrendIcon = diff == null || Math.abs(diff) < 0.05 ? Minus : diff > 0 ? ArrowUp : ArrowDown;
  const trendColor = diff == null || Math.abs(diff) < 0.05 ? '#71717a' : diff > 0 ? '#34d399' : '#f87171';

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] px-5 py-3.5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="weather-widget"
    >
      {/* Intense glowing ambient purple light gradient below the arc meter */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#554bf5]/30 rounded-full blur-[28px] pointer-events-none transition-all duration-500 group-hover:bg-[#554bf5]/45 group-hover:scale-110 z-0" />

      {/* Header Row: Title + trend vs. baseline */}
      <div className="flex items-center justify-between z-10 pl-0.5 pt-0.5 gap-2">
        <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans">
          OMNI-Voice Confidence
        </span>
        {diff != null && (
          <span
            className="flex items-center gap-1 text-[11px] font-bold flex-shrink-0 font-sans"
            style={{ color: trendColor, filter: `drop-shadow(0 0 6px ${trendColor}80)` }}
          >
            <TrendIcon className="w-3.5 h-3.5" strokeWidth={3} />
            {Math.abs(diff) < 0.05 ? 'On par' : `${Math.abs(diff).toFixed(1)} pts ${diff > 0 ? 'up' : 'down'}`}
          </span>
        )}
      </div>

      {/* Arc Meter or empty state */}
      {confidence != null ? (
        <div className="relative flex flex-col items-center justify-center select-none z-10 pb-0.5">
          <div className="relative w-[160px] h-[68px] overflow-hidden flex items-end justify-center mb-1">
            <svg className="absolute top-0 left-0 w-[160px] h-[80px]" viewBox="0 0 160 80">
              <path d="M 16,80 A 64,64 0 0,1 144,80" fill="none" stroke="#2a2a2f" strokeWidth={strokeWidth} strokeLinecap="round" />
              <path d="M 16,80 A 64,64 0 0,1 144,80" fill="none" stroke="#34343a" strokeWidth={strokeWidth - 2} strokeLinecap="round" className="opacity-40" />
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
              <defs>
                <linearGradient id="purpleGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3d37f1" />
                  <stop offset="50%" stopColor="#554bf5" />
                  <stop offset="100%" stopColor="#6961ff" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end h-full">
              <div className="flex items-end justify-center gap-0.5 pb-1">
                <span className="text-[28px] font-light text-white tracking-tighter leading-none select-none font-sans">{confidence}</span>
                <span className="text-[9px] font-semibold text-zinc-400 mb-1 select-none font-sans">/5</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-sans">
            Target: <span className="text-zinc-300 font-medium">{TARGET_CONFIDENCE}/5</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center z-10 flex-1">
          <span className="text-[10px] text-zinc-600 font-mono tracking-wide">Complete daily check-in</span>
        </div>
      )}
    </div>
  );
}
