import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EventCreationFlow, { type ChatTurn, type NewEventPlan } from './EventCreationFlow';

export interface VocalEvent {
  id: string;
  title: string;
  date: string;     // 'YYYY-MM-DD'
  time?: string;    // 'HH:MM'
  location?: string;
  prepDaysBefore?: number;
  tailoredRitualIds?: string[];
  aiInsight?: string;
  chatTranscript?: ChatTurn[];
}

interface Props {
  events: VocalEvent[];
  onAddEvent: (event: Omit<VocalEvent, 'id'>) => void;
  onUpdateEvent: (id: string, event: Omit<VocalEvent, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
}

function formatDate(iso: string): string {
  const [, month, day] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${day}`;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + 'T00:00:00');
  const to = new Date(toIso + 'T00:00:00');
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function isPrepActive(event: VocalEvent, todayIso: string): boolean {
  if (!event.prepDaysBefore || !event.tailoredRitualIds?.length) return false;
  const prepStart = addDays(event.date, -event.prepDaysBefore);
  return todayIso >= prepStart && todayIso <= event.date;
}

const inputClass = 'w-full h-11 rounded-xl px-4 text-[13px] font-light text-zinc-200 placeholder-zinc-600 outline-none transition-colors duration-150';
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(33,232,255,0.3)');
const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)');

export default function UpcomingEventsCard({ events, onAddEvent, onUpdateEvent, onDeleteEvent }: Props) {
  // Add flow
  const [showAdd, setShowAdd] = useState(false);

  // Edit modal
  const [selected, setSelected] = useState<VocalEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const todayIso = new Date().toISOString().slice(0, 10);

  // ── Add ──────────────────────────────────────────────────────────────────────
  const openAdd = () => setShowAdd(true);
  const closeAdd = () => setShowAdd(false);

  const handleCreateEvent = (event: NewEventPlan) => {
    onAddEvent({
      title: event.title,
      date: event.date,
      location: event.location,
      prepDaysBefore: event.prepDaysBefore,
      tailoredRitualIds: event.tailoredRitualIds,
      aiInsight: event.aiInsight,
      chatTranscript: event.chatTranscript,
    });
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const openEdit = (event: VocalEvent) => {
    setSelected(event);
    setEditTitle(event.title);
    setEditDate(event.date);
    setEditTime(event.time ?? '');
    setEditLocation(event.location ?? '');
  };
  const closeEdit = () => setSelected(null);

  const handleSave = () => {
    if (!editTitle.trim() || !editDate || !selected) return;
    onUpdateEvent(selected.id, {
      title: editTitle.trim(),
      date: editDate,
      time: editTime || undefined,
      location: editLocation.trim() || undefined,
    });
    closeEdit();
  };

  const handleDelete = () => {
    if (!selected) return;
    onDeleteEvent(selected.id);
    closeEdit();
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">Upcoming Events</h3>
          <button
            onClick={openAdd}
            className="flex items-center text-zinc-500 hover:text-zinc-300 transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 transition-transform duration-150 hover:scale-115" />
          </button>
        </div>

        <div className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] py-6 px-5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col h-auto relative overflow-hidden hover:border-zinc-700/60 hover:bg-[#1d212a] w-full">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-zinc-800/8 rounded-full blur-[28px] pointer-events-none z-0" />

          <div className="relative z-10 flex flex-col gap-4">
            {sorted.length === 0 ? (
              <p className="text-[11px] text-zinc-600 text-center py-2">No events planned</p>
            ) : (
              sorted.map((event, i) => {
                const isPast = event.date < todayIso;
                const prepActive = !isPast && isPrepActive(event, todayIso);
                const daysLeft = prepActive ? daysBetween(todayIso, event.date) : 0;

                if (isPast) {
                  return (
                    <div key={event.id}>
                      {i > 0 && <div className="h-px bg-zinc-800/40 w-full mb-4" />}
                      <div className="group flex items-center justify-between gap-3.5 py-1.5 px-2.5 w-full rounded-xl bg-black/20 border border-transparent transition-all duration-200 hover:bg-emerald-500/[0.06] hover:border-emerald-500/20">
                        <div className="grayscale opacity-60 flex-1 min-w-0">
                          <h4 className="text-[12px] font-medium text-zinc-400 truncate line-through decoration-zinc-600 decoration-1">{event.title}</h4>
                          <p className="text-[10.5px] mt-0.5 text-zinc-600">Event has passed</p>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className="grayscale opacity-60 text-[11px] font-light uppercase tracking-wider text-zinc-600 select-none line-through decoration-zinc-700">
                            {formatDate(event.date)}
                          </span>
                          <button
                            onClick={() => onDeleteEvent(event.id)}
                            className="flex items-center justify-center h-6 w-6 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 group-hover:border-emerald-400/60 group-hover:bg-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-400/70 hover:text-emerald-300 transition-all duration-150 cursor-pointer"
                            aria-label="Mark complete and remove"
                            title="Mark complete and remove"
                          >
                            <Check className="w-2 h-2" strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={event.id}>
                    {i > 0 && <div className="h-px bg-zinc-800/40 w-full mb-4" />}
                    <button
                      onClick={() => openEdit(event)}
                      className={`flex items-center justify-between gap-3.5 py-1.5 px-2.5 w-full rounded-xl transition-all duration-200 cursor-pointer text-left ${prepActive
                        ? 'bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.28)] shadow-[0_0_14px_rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.13)] hover:border-[rgba(96,165,250,0.5)] hover:shadow-[0_0_20px_rgba(59,130,246,0.18)]'
                        : 'hover:bg-white/[0.03]'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[12px] font-medium text-zinc-200 truncate">{event.title}</h4>
                          {prepActive && (

                            <span className="text-[6px] font-mono uppercase tracking-wider text-[#60a5fa]">Active</span>

                          )}
                        </div>
                        <p className="text-[10.5px] mt-0.5" style={{ color: prepActive ? 'rgba(96,165,250,0.8)' : undefined }}>
                          {prepActive
                            ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to prepare`
                            : [event.location, event.time].filter(Boolean).join(' • ') || null}
                        </p>
                      </div>
                      <div
                        className="text-[11px] font-light uppercase tracking-wider flex-shrink-0 select-none"
                        style={{ color: prepActive ? '#60a5fa' : 'rgba(161,161,170,1)' }}
                      >
                        {formatDate(event.date)}
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Add Flow (details → AI chat → prep plan) ───────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <EventCreationFlow onClose={closeAdd} onComplete={handleCreateEvent} existingEvents={events} />
        )}
      </AnimatePresence>

      {/* ── Edit Modal ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
            onClick={closeEdit}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative w-full max-w-sm rounded-[28px] p-6 flex flex-col gap-5"
              style={{ background: 'linear-gradient(160deg, #0f1319 0%, #0b0e14 100%)', border: '1px solid rgba(33,232,255,0.15)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.3), transparent)' }} />

              <div className="flex items-center justify-between">
                <p className="text-[9px] font-mono tracking-widest uppercase text-[#21e8ff]/60">Edit Event</p>
                <button onClick={closeEdit} className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 transition-colors cursor-pointer">
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <input autoFocus placeholder="Event name" value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className={inputClass} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className={`${inputClass} [color-scheme:dark]`} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className={`${inputClass} [color-scheme:dark]`} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
                </div>
                <input placeholder="Location (optional)" value={editLocation} onChange={e => setEditLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className={inputClass} style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
              </div>

              <button onClick={handleSave} disabled={!editTitle.trim() || !editDate} className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}>
                Save Changes
              </button>

              <button onClick={handleDelete} className="w-full h-11 rounded-xl text-[11px] opacity-70 tracking-widest uppercase font-medium transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2  hover:text-red-400">
                Delete Event
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
