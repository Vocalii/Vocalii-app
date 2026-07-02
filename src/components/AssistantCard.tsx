import React from 'react';

const HABITS = [
  { dailyEmoji: '☕', dailyLabel: 'Morning coffee', vocalEmoji: '🎵', vocalLabel: '2-min vocal hum' },
  { dailyEmoji: '🪥', dailyLabel: 'Brushing teeth', vocalEmoji: '🌬️', vocalLabel: 'Deep breathing' },
  { dailyEmoji: '🌙', dailyLabel: 'Bedtime routine', vocalEmoji: '🤫', vocalLabel: 'Silent rest (2 min)' },
];

export default function AssistantCard() {
  return (
    <div
      className="bg-gradient-to-b from-[#17A9C9]/15 to-[#12141a]/90 hover:from-[#17A9C9]/22 hover:to-[#12141a]/95 border border-[#17A9C9]/30 hover:border-[#17A9C9]/50 rounded-[28px] p-5 shadow-[0_0_20px_rgba(23,169,201,0.06)] hover:shadow-[0_0_30px_rgba(23,169,201,0.12)] transition-all duration-500 flex flex-col h-auto relative overflow-hidden group select-none w-full"
      id="todos-card"
    >
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/50 to-transparent" />
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#17A9C9]/15 rounded-full blur-[35px] pointer-events-none transition-all duration-500 group-hover:bg-[#17A9C9]/30 group-hover:scale-110 z-0" />

      <div className="flex flex-col gap-3 z-10">
        {HABITS.map((h, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent">
            <div className="w-1.5 h-1.5 rounded-full shrink-0 self-start mt-[5px]" style={{ background: 'rgba(33,232,255,0.5)', boxShadow: '0 0 4px rgba(33,232,255,0.4)' }} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] text-zinc-300 font-normal leading-snug">{h.vocalLabel}</span>
              <span className="text-[9px] font-light text-zinc-600">{h.dailyLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
