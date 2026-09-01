import { Check, Info } from 'lucide-react';
import { TUTORIAL_STEPS } from '../lib/tutorialSteps';

interface Props {
  checkinDone: boolean;
  ritualDone: boolean;
  analyzerDone: boolean;
  onReplayStep: (index: number) => void;
}

// Sits at the bottom of the dashboard's right column until every step below is done — scrolls
// with the page like any other card, it's not a floating/pinned overlay. App.tsx only renders
// this at all when !tutorialComplete. Step labels come from TUTORIAL_STEPS (shared with
// TutorialVideoOverlay.tsx) so the two never drift apart.
export default function GettingStartedCard({ checkinDone, ritualDone, analyzerDone, onReplayStep }: Props) {
  const doneMap = { checkin: checkinDone, ritual: ritualDone, analyzer: analyzerDone };
  const doneCount = Object.values(doneMap).filter(Boolean).length;

  return (
    <div
      className="w-full bg-gradient-to-b from-[#17A9C9]/15 to-[#12141a]/95 border border-[#17A9C9]/30 rounded-[24px] p-4 shadow-[0_0_20px_rgba(23,169,201,0.06)] transition-all duration-500 flex flex-col relative overflow-hidden select-none"
      id="getting-started-card"
    >
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/50 to-transparent" />
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-[#17A9C9]/15 rounded-full blur-[35px] pointer-events-none z-0" />

      <div className="flex items-center gap-2.5 z-10 pr-1">
        <h3 className="text-sm font-medium tracking-tight text-neutral-200 font-sans flex-1">Getting Started</h3>
        <span className="text-[11px] font-light text-[#21e8ff]/70 tracking-wide">{doneCount}/{TUTORIAL_STEPS.length}</span>
      </div>

      <div className="flex flex-col gap-1.5 mt-3 z-10">
        {TUTORIAL_STEPS.map(({ key, label }, i) => {
          const done = doneMap[key];
          return (
            <div key={key} className="flex items-center gap-2.5 py-1.5">
              <div
                className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{ background: 'transparent', border: `1.5px solid ${done ? 'rgba(14,116,144,0.95)' : 'rgba(255,255,255,0.2)'}` }}
              >
                {done && <Check className="w-3 h-3 text-[#0e7490]" strokeWidth={3} />}
              </div>
              <span className={`text-[12px] leading-snug flex-1 ${done ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-300'}`}>
                {label}
              </span>
              <button
                onClick={() => onReplayStep(i)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-600 hover:text-[#21e8ff] transition-colors duration-150 cursor-pointer flex-shrink-0"
                aria-label={`Replay video: ${label}`}
                title="Watch how-to video"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
