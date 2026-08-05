import { useState } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HabitPair } from '../types/onboarding';
import { DAILY_HABITS, VOCAL_HABITS } from './onboarding/ScreenHabits';
import HabitPairPicker from './HabitPairPicker';

const DEFAULT_HABITS = [
  { dailyLabel: 'Morning coffee', vocalLabel: '2-min vocal hum' },
  { dailyLabel: 'Brushing teeth', vocalLabel: 'Deep breathing' },
  { dailyLabel: 'Bedtime routine', vocalLabel: 'Silent rest (2 min)' },
];

interface Props {
  habits?: HabitPair[];
  onSave?: (pairs: HabitPair[]) => void;
}

export default function HabitCard({ habits, onSave }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [draftPairs, setDraftPairs] = useState<HabitPair[]>(habits ?? []);

  const resolved = habits && habits.length > 0
    ? habits.map(p => ({
        dailyLabel: DAILY_HABITS.find(h => h.id === p.daily)?.label ?? p.daily,
        vocalLabel: VOCAL_HABITS.find(h => h.id === p.vocal)?.label ?? p.vocal,
      }))
    : DEFAULT_HABITS;

  const openEdit = () => {
    setDraftPairs(habits ?? []);
    setShowEdit(true);
  };

  const handleSave = () => {
    onSave?.(draftPairs);
    setShowEdit(false);
  };

  return (
    <>
      <div
        className="bg-gradient-to-b from-[#17A9C9]/15 to-[#12141a]/90 hover:from-[#17A9C9]/22 hover:to-[#12141a]/95 border border-[#17A9C9]/30 hover:border-[#17A9C9]/50 rounded-[28px] p-5 shadow-[0_0_20px_rgba(23,169,201,0.06)] hover:shadow-[0_0_30px_rgba(23,169,201,0.12)] transition-all duration-500 flex flex-col h-auto relative overflow-hidden group select-none w-full"
        id="todos-card"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/50 to-transparent" />
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#17A9C9]/15 rounded-full blur-[35px] pointer-events-none transition-all duration-500 group-hover:bg-[#17A9C9]/30 group-hover:scale-110 z-0" />

        <button
          onClick={openEdit}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center bg-zinc-900/60 border border-zinc-800/80 text-zinc-500 hover:text-[#21e8ff] hover:border-[#17A9C9]/40 transition-all duration-150 cursor-pointer z-20"
          aria-label="Edit habits"
        >
          <Pencil className="w-3 h-3" />
        </button>

        <div className="flex flex-col gap-3 z-10">
          {resolved.map((h, i) => (
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

      {/* Edit modal */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
            onClick={() => setShowEdit(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative w-full max-w-lg rounded-[28px] p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
              style={{ background: 'linear-gradient(160deg, #0f1319 0%, #0b0e14 100%)', border: '1px solid rgba(33,232,255,0.15)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.3), transparent)' }} />

              <div className="flex items-center justify-between">
                <p className="text-[9px] font-mono tracking-widest uppercase text-[#21e8ff]/60">Edit Habits</p>
                <button onClick={() => setShowEdit(false)} className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 transition-colors cursor-pointer">
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              <HabitPairPicker value={draftPairs} onChange={setDraftPairs} />

              <button
                onClick={handleSave}
                className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}
              >
                <Check className="w-3.5 h-3.5" /> Save Changes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
