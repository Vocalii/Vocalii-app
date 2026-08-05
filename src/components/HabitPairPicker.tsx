import { useState } from 'react';
import { X } from 'lucide-react';
import { HabitPair } from '../types/onboarding';
import { DAILY_HABITS, VOCAL_HABITS } from './onboarding/ScreenHabits';

const SELECTED_STYLE = (color = '#21e8ff') => ({
  background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
  borderColor: `${color}50`,
  boxShadow: `0 0 20px ${color}18, inset 0 1px 0 ${color}18`,
});
const UNSELECTED_STYLE = { borderColor: 'rgba(39,39,42,0.8)' };

interface Props {
  value: HabitPair[];
  onChange: (pairs: HabitPair[]) => void;
}

export default function HabitPairPicker({ value, onChange }: Props) {
  const [pendingDaily, setPendingDaily] = useState<string | null>(null);

  const pairedDailyIds = new Set(value.map(p => p.daily));
  const pairedVocalIds = new Set(value.map(p => p.vocal));

  const handleDailyClick = (id: string) => {
    if (pairedDailyIds.has(id)) return;
    setPendingDaily(prev => prev === id ? null : id);
  };
  const handleVocalClick = (id: string) => {
    if (pairedVocalIds.has(id) || !pendingDaily) return;
    onChange([...value, { daily: pendingDaily, vocal: id }]);
    setPendingDaily(null);
  };
  const removePair = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 text-center">
        {pendingDaily
          ? `Now pick a vocal habit to pair with "${DAILY_HABITS.find(h => h.id === pendingDaily)?.label}"`
          : 'Select a daily habit first'}
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block mb-2.5 text-center">Daily habits</span>
          <div className="flex flex-col gap-2">
            {DAILY_HABITS.map(h => {
              const isPaired = pairedDailyIds.has(h.id);
              const isPending = pendingDaily === h.id;
              return (
                <button
                  key={h.id}
                  disabled={isPaired}
                  onClick={() => handleDailyClick(h.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all duration-150 disabled:cursor-default disabled:opacity-35 cursor-pointer"
                  style={isPending ? SELECTED_STYLE() : UNSELECTED_STYLE}
                >
                  <span className="text-base leading-none">{h.emoji}</span>
                  <span className="text-[11.5px]" style={{ color: isPending ? '#fff' : '#a1a1aa' }}>{h.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block mb-2.5 text-center">Vocal habits</span>
          <div className="flex flex-col gap-2">
            {VOCAL_HABITS.map(h => {
              const isPaired = pairedVocalIds.has(h.id);
              const isClickable = !!pendingDaily && !isPaired;
              return (
                <button
                  key={h.id}
                  disabled={isPaired || !pendingDaily}
                  onClick={() => handleVocalClick(h.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all duration-150 disabled:cursor-default cursor-pointer"
                  style={isPaired ? { ...UNSELECTED_STYLE, opacity: 0.35 } : isClickable ? SELECTED_STYLE('#3b82f6') : { ...UNSELECTED_STYLE, opacity: 0.5 }}
                >
                  <span className="text-base leading-none">{h.emoji}</span>
                  <span className="text-[11.5px]" style={{ color: isClickable ? '#93c5fd' : '#71717a' }}>{h.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          {value.map((pair, i) => {
            const daily = DAILY_HABITS.find(h => h.id === pair.daily);
            const vocal = VOCAL_HABITS.find(h => h.id === pair.vocal);
            return (
              <div key={`${pair.daily}-${pair.vocal}`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(23,169,201,0.08)', border: '1px solid rgba(33,232,255,0.15)' }}>
                <span className="text-[11.5px] text-zinc-300">{daily?.emoji} {daily?.label}</span>
                <span className="text-zinc-600 text-[10px]">→</span>
                <span className="text-[11.5px] text-zinc-300">{vocal?.emoji} {vocal?.label}</span>
                <button onClick={() => removePair(i)} className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
