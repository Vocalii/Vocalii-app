import { useState, useEffect, useRef } from 'react';
import { X, Send, ChevronLeft, Flame, Droplet, HeartCrack, Activity, Compass, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EXERCISE_RITUALS } from '../ritualsData';

const CATEGORY_STYLE: Record<string, { color: string; Icon: typeof Sparkles }> = {
  'Warm-up': { color: '#fbbf24', Icon: Flame },
  'Hydration': { color: '#60a5fa', Icon: Droplet },
  'Relief': { color: '#fb7185', Icon: HeartCrack },
  'Resonance': { color: '#a78bfa', Icon: Activity },
  'Calibrate': { color: '#22d3ee', Icon: Compass },
};

function CategoryBubble({ category }: { category: string }) {
  const { color, Icon } = CATEGORY_STYLE[category] ?? { color: '#21e8ff', Icon: Sparkles };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 38% 32%, ${color}22 0%, ${color}08 100%)`,
          border: `1px solid ${color}40`,
          boxShadow: `0 0 16px ${color}14`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span className="text-[8.5px] font-mono text-zinc-500 tracking-widest uppercase text-center">{category}</span>
    </div>
  );
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface DisplayTurn extends ChatTurn {
  awaitingConfirmation?: boolean;
}

export interface NewEventPlan {
  title: string;
  date: string;
  location?: string;
  prepDaysBefore: number;
  tailoredRitualIds: string[];
  aiInsight: string;
  chatTranscript: ChatTurn[];
}

interface ExistingEventSummary {
  title: string;
  date: string;
  prepDaysBefore?: number;
  tailoredRitualIds?: string[];
}

interface Props {
  onClose: () => void;
  onComplete: (event: NewEventPlan) => void;
  existingEvents: ExistingEventSummary[];
}

function windowsOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 <= e2 && s2 <= e1;
}

const inputClass = 'w-full h-11 rounded-xl px-4 text-[13px] font-light text-zinc-200 placeholder-zinc-600 outline-none transition-colors duration-150';
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(33,232,255,0.3)');
const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)');

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

const ORB_BAR_HEIGHTS = [7, 13, 19, 25, 17, 11, 22, 15, 9];

function VoiceOrb({ active }: { active: boolean }) {
  return (
    <div className="relative w-24 h-24 mx-auto flex items-center justify-center flex-shrink-0">
      <div
        className="relative rounded-full flex items-center justify-center overflow-hidden z-10"
        style={{
          width: 64,
          height: 64,
          background: 'radial-gradient(circle, rgba(33,232,255,0.16) 0%, rgba(11,14,20,0.65) 75%)',
          border: '1px solid rgba(33,232,255,0.4)',
          boxShadow: '0 0 24px rgba(33,232,255,0.25), inset 0 0 14px rgba(33,232,255,0.12)',
        }}
      >
        <div className="flex items-center gap-[3px] h-8">
          {ORB_BAR_HEIGHTS.map((h, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full flex-shrink-0"
              style={{ height: `${h}px`, background: 'linear-gradient(to top, #0e6d82, #21e8ff)' }}
              animate={{
                scaleY: active ? [0.35, 1, 0.35] : [0.25, 0.5, 0.25],
              }}
              transition={{
                duration: active ? 0.3 + (i % 4) * 0.06 : 0.8 + (i % 3) * 0.12,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.03,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function addDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + 'T00:00:00');
  const to = new Date(toIso + 'T00:00:00');
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export default function EventCreationFlow({ onClose, onComplete, existingEvents }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');

  // Step 2
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [displayMessages, setDisplayMessages] = useState<DisplayTurn[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [plan, setPlan] = useState<{ ritualIds: string[]; insight: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Step 3 — sliderPos is a continuous raw position (8 - days before) so dragging
  // feels smooth even when the valid day range is narrow; the day count snaps to
  // whole numbers only for display/save.
  const [sliderPos, setSliderPos] = useState(5);
  const prepDaysBefore = Math.round(8 - sliderPos);
  const [saved, setSaved] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const daysUntilEvent = date ? daysBetween(todayIso, date) : 7;

  // Only one prep window can be active at a time — find any other event whose
  // prep window would overlap this one's, so we can block or shrink the range.
  const activePrepEvents = existingEvents.filter(
    e => e.prepDaysBefore && e.tailoredRitualIds?.length && e.date >= todayIso
  );

  const conflictingEvent = date
    ? activePrepEvents.find(e => {
        const existingStart = addDays(e.date, -(e.prepDaysBefore as number));
        const minNewStart = addDays(date, -1);
        return windowsOverlap(minNewStart, date, existingStart, e.date);
      })
    : undefined;

  const conflictCaps = date
    ? activePrepEvents.map(e => {
        const existingStart = addDays(e.date, -(e.prepDaysBefore as number));
        if (date < existingStart) return Infinity;
        return daysBetween(e.date, date) - 1;
      })
    : [];
  const conflictCap = conflictCaps.length ? Math.min(...conflictCaps) : Infinity;

  const maxPrepDays = Math.max(1, Math.min(7, daysUntilEvent, conflictCap));
  const sliderMin = 8 - maxPrepDays;
  const sliderRange = 7 - sliderMin;
  const fillPct = sliderRange > 0 ? (1 - (sliderPos - sliderMin) / sliderRange) * 100 : 100;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [displayMessages, loading]);

  useEffect(() => {
    if (sliderPos < sliderMin) setSliderPos(sliderMin);
    if (sliderPos > 7) setSliderPos(7);
  }, [sliderMin, sliderPos]);

  const sendMessage = async (content: string, visible = true) => {
    const nextHistory = [...history, { role: 'user' as const, content }];
    setHistory(nextHistory);
    if (visible) setDisplayMessages(prev => [...prev, { role: 'user', content }]);
    setLoading(true);
    setChatError(null);

    try {
      const res = await fetch('/api/event-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { title, date, location: location || null }, history: nextHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      if (data.type === 'plan') {
        setPlan({ ritualIds: data.ritualIds, insight: data.insight });
        setStep(3);
      } else {
        setHistory(prev => [...prev, { role: 'assistant', content: data.content }]);
        setDisplayMessages(prev => [...prev, { role: 'assistant', content: data.content, awaitingConfirmation: !!data.awaitingConfirmation }]);
        setStep(2);
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to reach the AI service.');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const beginChat = () => {
    setStep(2);
    if (history.length === 0) {
      void sendMessage(
        `I'm preparing for "${title.trim()}" on ${date}${location.trim() ? ` at ${location.trim()}` : ''}. Please ask me your first question.`,
        false
      );
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText('');
    const lastMessage = displayMessages[displayMessages.length - 1];
    if (lastMessage?.awaitingConfirmation) setStep(3);
    void sendMessage(text);
  };

  const handleConfirm = () => {
    if (!plan) return;
    onComplete({
      title: title.trim(),
      date,
      location: location.trim() || undefined,
      prepDaysBefore,
      tailoredRitualIds: plan.ritualIds,
      aiInsight: plan.insight,
      chatTranscript: history,
    });
    setSaved(true);
  };

  const stepTitle = step === 1 ? 'New Event' : step === 2 ? 'Tell Us About It' : 'Your Prep Plan';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg rounded-[28px] p-6 flex flex-col gap-5"
        style={{ background: 'linear-gradient(160deg, #0f1319 0%, #0b0e14 100%)', border: '1px solid rgba(33,232,255,0.15)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.3), transparent)' }} />

        <div className={`flex items-center ${saved ? 'justify-center' : 'justify-between'}`}>
          {!saved && (
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(s => (s - 1) as 1 | 2)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 flex-shrink-0"
                  style={{ background: 'rgba(23,169,201,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}
                >
                  <ChevronLeft className="w-4 h-4 text-[#21e8ff]" />
                </button>
              )}
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-500">{stepTitle}</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map(s => (
                    <div
                      key={s}
                      className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                      style={step >= s
                        ? { background: '#21e8ff', boxShadow: '0 0 6px rgba(33,232,255,0.9), 0 0 12px rgba(33,232,255,0.4)' }
                        : { background: 'rgba(255,255,255,0.12)' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {saved && (
            <span className="text-[15px] font-mono tracking-wide text-white opacity-70 mt-2">Success</span>
          )}
          {!saved && (
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 transition-colors cursor-pointer flex-shrink-0">
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>

        {saved && (
          <div className="flex flex-col items-center justify-center gap-6 py-10">
            <motion.div
              className="relative flex items-center justify-center"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ width: 120, height: 120, background: 'radial-gradient(circle, rgba(33,232,255,0.15) 0%, transparent 70%)' }}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center relative z-10"
                style={{ background: 'rgba(33,232,255,0.08)', border: '1px solid rgba(33,232,255,0.3)' }}
              >
                <svg viewBox="0 0 52 52" className="w-10 h-10" fill="none">
                  <motion.path
                    d="M13 26 L22 35 L39 17"
                    stroke="#21e8ff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
                  />
                </svg>
              </div>
            </motion.div>

            <div className="flex flex-col items-center gap-1.5 text-center">
              <p className="text-[15px] font-semibold text-white">Event Created</p>
              <p className="text-[12px] text-zinc-400 max-w-[280px] leading-relaxed">
                Prep mode starts {formatDate(addDays(date, -prepDaysBefore))} and runs through {formatDate(date)}.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}
            >
              Done
            </button>
          </div>
        )}

        {!saved && step === 1 && (
          <div className="flex flex-col gap-3">
            <input
              autoFocus placeholder="Event name" value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputClass} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
            />
            <input
              type="date" value={date}
              onChange={e => setDate(e.target.value)}
              className={`${inputClass} [color-scheme:dark]`} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
            />
            <input
              placeholder="Location (optional)" value={location}
              onChange={e => setLocation(e.target.value)}
              className={inputClass} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
            />
            {conflictingEvent && (
              <p className="text-[11px] text-rose-400 leading-relaxed -mt-1">
                This overlaps with your prep window for "{conflictingEvent.title}" ({formatDate(addDays(conflictingEvent.date, -(conflictingEvent.prepDaysBefore as number)))} – {formatDate(conflictingEvent.date)}). Only one preparation mode can be active at a time.
              </p>
            )}
            <button
              onClick={beginChat}
              disabled={!title.trim() || !date || !!conflictingEvent}
              className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}
            >
              Continue
            </button>
          </div>
        )}

        {!saved && step === 2 && (
          <div className="flex flex-col gap-3">
            <VoiceOrb active={loading} />
            <div ref={scrollRef} className="flex flex-col gap-2.5 h-72 overflow-y-auto px-0.5">
              <AnimatePresence initial={false}>
                {displayMessages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <motion.div
                      className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed"
                      style={m.role === 'user'
                        ? { background: 'rgba(23,169,201,0.15)', border: '1px solid rgba(33,232,255,0.25)', color: '#e4e4e7' }
                        : m.awaitingConfirmation
                          ? { background: 'linear-gradient(135deg, rgba(33,232,255,0.22) 0%, rgba(23,169,201,0.10) 100%)', border: '1px solid rgba(33,232,255,0.55)', color: '#eafcff' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
                      animate={m.awaitingConfirmation ? {
                        boxShadow: [
                          '0 0 12px rgba(33,232,255,0.25)',
                          '0 0 18px rgba(33,232,255,0.4)',
                          '0 0 12px rgba(33,232,255,0.25)',
                        ],
                      } : undefined}
                      transition={m.awaitingConfirmation ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : undefined}
                    >
                      {m.content}
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              {chatError && <p className="text-[11px] text-rose-400 text-center py-1">{chatError}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type your answer..."
                disabled={loading}
                autoFocus
                className={`${inputClass} flex-1`} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
              />
              <button
                onClick={handleSend}
                disabled={loading || !inputText.trim()}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)' }}
              >
                <Send className="w-4 h-4 text-[#21e8ff]" />
              </button>
            </div>
          </div>
        )}

        {!saved && step === 3 && !plan && (
          <div className="flex flex-col items-center justify-center gap-6 py-14">
            <div style={{ transform: 'scale(1.35)' }}>
              <VoiceOrb active />
            </div>
            <motion.p
              className="text-[11px] font-mono tracking-[0.28em] uppercase text-[#21e8ff]/70"
              animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              Analyzing
            </motion.p>
          </div>
        )}

        {!saved && step === 3 && plan && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-zinc-300 leading-relaxed">{plan.insight}</p>

            <div className="flex items-start justify-center gap-6 py-1">
              {Array.from(new Set(
                plan.ritualIds
                  .map(id => EXERCISE_RITUALS.find(r => r.id === id)?.category)
                  .filter(Boolean) as string[]
              )).slice(0, 3).map(category => (
                <CategoryBubble key={category} category={category} />
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-zinc-400">Start preparation</span>
                <span className="text-[11px] text-[#21e8ff]">{prepDaysBefore} day{prepDaysBefore === 1 ? '' : 's'} before</span>
              </div>
              <input
                type="range" min={sliderMin} max={7} step={0.01}
                value={sliderPos}
                onChange={e => setSliderPos(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(33,232,255,0.6),0_0_14px_rgba(33,232,255,0.25)] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-75 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab"
                style={{
                  background: `linear-gradient(to left, rgba(14,90,110,0.8) 0%, rgba(23,169,201,0.9) ${fillPct}%, rgba(255,255,255,0.08) ${fillPct}%, rgba(255,255,255,0.08) 100%)`,
                  transition: 'background 0.05s linear',
                  filter: `drop-shadow(0 0 2px rgba(23,169,201,${0.15 + (fillPct / 100) * 0.25}))`,
                }}
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px] text-zinc-600 font-mono">{formatDate(addDays(date, -maxPrepDays))}</span>
                <span className="text-[9px] text-zinc-600 font-mono">{formatDate(date)} (event day)</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}
            >
              Confirm & Save Event
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
