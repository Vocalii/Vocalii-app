import React from 'react';
import { Destination } from '../types';

interface PriceWidgetProps {
  destination: Destination;
}

const BASELINE = 62;
const RECENT   = 74;

export default function PriceWidget({ destination: _destination }: PriceWidgetProps) {
  const delta = RECENT - BASELINE;

  return (
    <div
      className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] px-5 py-4 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col justify-between h-[132px] relative overflow-hidden group select-none hover:border-zinc-700/70 hover:bg-[#1d212a]"
      id="price-trend-widget"
    >
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-16 bg-[#10b981]/15 rounded-full blur-[28px] pointer-events-none z-0" />

      <span className="text-sm font-medium tracking-tight text-neutral-300 font-sans z-10">Baseline Comparison</span>

      <div className="flex flex-col gap-2 z-10">
        {[
          { label: 'Baseline', value: BASELINE, color: 'rgba(82,82,91,0.55)', textColor: '#52525b', glow: false },
          { label: 'Recent',   value: RECENT,   color: '#34d399',              textColor: '#34d399', glow: true  },
        ].map(row => (
          <div key={row.label} className="flex items-center gap-2.5">
            <span className="text-[9px] font-mono w-11 shrink-0" style={{ color: row.textColor }}>{row.label}</span>
            <div className="flex-1 h-[6px] rounded-full bg-zinc-800/50 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${row.value}%`,
                  background: row.color,
                  boxShadow: row.glow ? '0 0 6px rgba(52,211,153,0.5)' : 'none',
                }}
              />
            </div>
            <span className="text-[9px] font-mono w-6 text-right" style={{ color: row.textColor }}>{row.value}%</span>
          </div>
        ))}
      </div>

      <span className="text-[9px] font-mono text-zinc-600 z-10">
        Vocal resonance · <span className="text-emerald-400">+{delta}pts</span> since baseline
      </span>
    </div>
  );
}
