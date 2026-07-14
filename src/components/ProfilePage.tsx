import { useState } from 'react';
import { ChevronLeft, Pencil, Check, X } from 'lucide-react';
import { Role, ExperienceLevel, Goal, VoiceBarrier, HabitPair } from '../types/onboarding';
import { ROLES } from './onboarding/ScreenRole';
import { LEVELS } from './onboarding/ScreenExperience';
import { GOALS } from './onboarding/ScreenGoals';
import { TRAITS, TRAIT_COLORS } from './onboarding/ScreenVoiceTraits';
import { CLUSTERS } from './onboarding/ScreenVoiceBarriers';
import { DAILY_HABITS, VOCAL_HABITS } from './onboarding/ScreenHabits';

export interface ProfileUpdates {
  firstName?: string;
  lastName?: string;
  role?: Role | null;
  experienceLevel?: ExperienceLevel | null;
  desiredVoiceTraits?: string[];
  goals?: Goal[];
  voiceBarrier?: VoiceBarrier | null;
  habitPairs?: HabitPair[];
}

interface ProfilePageProps {
  onBack: () => void;
  firstName: string;
  lastName: string;
  email: string | null;
  role: Role | null;
  experienceLevel: ExperienceLevel | null;
  desiredVoiceTraits: string[];
  goals: Goal[];
  voiceBarrier: VoiceBarrier | null;
  habitPairs: HabitPair[];
  onSave: (updates: ProfileUpdates) => void;
}

type Section = 'identity' | 'role' | 'experience' | 'traits' | 'goals' | 'barrier' | 'habits' | null;

const SELECTED_STYLE = (color = '#21e8ff') => ({
  background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
  borderColor: `${color}50`,
  boxShadow: `0 0 20px ${color}18, inset 0 1px 0 ${color}18`,
});
const UNSELECTED_STYLE = { borderColor: 'rgba(39,39,42,0.8)' };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#181b22] border border-zinc-800/80 rounded-[24px] p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#21e8ff]/15 to-transparent" />
      {children}
    </div>
  );
}

function SectionHeader({ label, editing, onEdit, onSave, onCancel, canSave }: {
  label: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  canSave: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-4 relative z-10">
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="text-[11px] text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 text-[11px] text-[#21e8ff] hover:text-white bg-[#17A9C9]/10 hover:bg-[#17A9C9]/20 border border-[#17A9C9]/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-3 h-3" /> Save
          </button>
        </div>
      ) : (
        <button onClick={onEdit} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-[#21e8ff] transition-colors cursor-pointer">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}
    </div>
  );
}

function PickerRow({ selected, icon, label, subtitle, color, onClick }: {
  selected: boolean;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all duration-200 select-none cursor-pointer w-full ${!selected ? 'bg-[#13161c] hover:bg-[#1c2028]' : ''}`}
      style={selected ? SELECTED_STYLE(color) : UNSELECTED_STYLE}
    >
      <div className="flex-shrink-0" style={{ color: selected ? (color ?? '#21e8ff') : '#71717a' }}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-[12.5px] font-medium" style={{ color: selected ? '#fff' : '#d4d4d8' }}>{label}</span>
        {subtitle && (
          <span className="text-[10.5px] mt-0.5 leading-snug" style={{ color: selected ? `${color ?? '#21e8ff'}99` : '#52525b' }}>{subtitle}</span>
        )}
      </div>
    </button>
  );
}

export default function ProfilePage({
  onBack, firstName, lastName, email, role, experienceLevel, desiredVoiceTraits, goals, voiceBarrier, habitPairs, onSave,
}: ProfilePageProps) {
  const [editing, setEditing] = useState<Section>(null);

  const [draftFirstName, setDraftFirstName] = useState(firstName);
  const [draftLastName, setDraftLastName] = useState(lastName);
  const [draftRole, setDraftRole] = useState<Role | null>(role);
  const [draftExperience, setDraftExperience] = useState<ExperienceLevel | null>(experienceLevel);
  const [draftTrait, setDraftTrait] = useState<string | null>(desiredVoiceTraits[0] ?? null);
  const [draftGoals, setDraftGoals] = useState<Goal[]>(goals);
  const [draftBarrier, setDraftBarrier] = useState<VoiceBarrier | null>(voiceBarrier);
  const [draftPairs, setDraftPairs] = useState<HabitPair[]>(habitPairs);
  const [pendingDaily, setPendingDaily] = useState<string | null>(null);

  const startEdit = (section: Section) => {
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    setDraftRole(role);
    setDraftExperience(experienceLevel);
    setDraftTrait(desiredVoiceTraits[0] ?? null);
    setDraftGoals(goals);
    setDraftBarrier(voiceBarrier);
    setDraftPairs(habitPairs);
    setPendingDaily(null);
    setEditing(section);
  };
  const cancelEdit = () => setEditing(null);

  const roleInfo = ROLES.find(r => r.id === role);
  const traitInfo = TRAITS.find(t => t.label === desiredVoiceTraits[0]);
  const barrierInfo = CLUSTERS.find(c => c.id === voiceBarrier);

  const toggleDraftGoal = (id: Goal) => {
    setDraftGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const pairedDailyIds = new Set(draftPairs.map(p => p.daily));
  const pairedVocalIds = new Set(draftPairs.map(p => p.vocal));

  const handleDailyClick = (id: string) => {
    if (pairedDailyIds.has(id)) return;
    setPendingDaily(prev => prev === id ? null : id);
  };
  const handleVocalClick = (id: string) => {
    if (pairedVocalIds.has(id) || !pendingDaily) return;
    setDraftPairs(prev => [...prev, { daily: pendingDaily, vocal: id }]);
    setPendingDaily(null);
  };
  const removeDraftPair = (index: number) => {
    setDraftPairs(prev => prev.filter((_, i) => i !== index));
  };

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div className="w-full pt-[88px] pb-10 select-none font-sans text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 md:px-12">

        {/* Header row */}
        <div className="flex items-center gap-3 mb-8 mt-6">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105"
            style={{ background: 'rgba(23,169,201,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}
          >
            <ChevronLeft className="w-4 h-4 text-[#21e8ff]" />
          </button>
          <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-500">Back</span>
        </div>

        <h2 className="text-3xl font-light tracking-tight text-white mb-2">Profile</h2>
        <p className="text-sm text-zinc-400 mb-8">Your account details and voice profile.</p>

        <div className="flex flex-col gap-5">

          {/* Identity card */}
          <Card>
            <SectionHeader
              label="Basic info"
              editing={editing === 'identity'}
              onEdit={() => startEdit('identity')}
              onCancel={cancelEdit}
              canSave={draftFirstName.trim().length > 0 && draftLastName.trim().length > 0}
              onSave={() => { onSave({ firstName: draftFirstName.trim(), lastName: draftLastName.trim() }); setEditing(null); }}
            />
            <div className="flex items-center gap-4 relative z-10">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #17A9C9 0%, #21e8ff 100%)', boxShadow: '0 0 24px rgba(33,232,255,0.25)' }}
              >
                {initials}
              </div>
              {editing === 'identity' ? (
                <div className="flex flex-col gap-2 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={draftFirstName}
                      onChange={e => setDraftFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-10 rounded-xl px-3.5 text-[13px] text-zinc-200 placeholder-zinc-600 outline-none border border-zinc-800 focus:border-[#21e8ff]/40 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                    <input
                      value={draftLastName}
                      onChange={e => setDraftLastName(e.target.value)}
                      placeholder="Last name"
                      className="h-10 rounded-xl px-3.5 text-[13px] text-zinc-200 placeholder-zinc-600 outline-none border border-zinc-800 focus:border-[#21e8ff]/40 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                  </div>
                  {email && <span className="text-[11px] text-zinc-600">{email}</span>}
                </div>
              ) : (
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-base font-medium text-white truncate">{firstName} {lastName}</span>
                  {email && <span className="text-[12px] text-zinc-500 truncate">{email}</span>}
                  {roleInfo && (
                    <span className="inline-flex items-center gap-1.5 mt-1 text-[10.5px] px-2 py-0.5 rounded-full w-fit" style={{ color: roleInfo.color, background: `${roleInfo.color}14`, border: `1px solid ${roleInfo.color}30` }}>
                      {roleInfo.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Role */}
          <Card>
            <SectionHeader
              label="Role"
              editing={editing === 'role'}
              onEdit={() => startEdit('role')}
              onCancel={cancelEdit}
              canSave={!!draftRole}
              onSave={() => { onSave({ role: draftRole }); setEditing(null); }}
            />
            {editing === 'role' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
                {ROLES.map(r => (
                  <PickerRow key={r.id} selected={draftRole === r.id} icon={r.icon} label={r.label} color={r.color} onClick={() => setDraftRole(r.id)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-300 relative z-10">
                {roleInfo ? roleInfo.label : <span className="text-zinc-600 italic">Not set</span>}
              </p>
            )}
          </Card>

          {/* Experience level */}
          <Card>
            <SectionHeader
              label="Experience level"
              editing={editing === 'experience'}
              onEdit={() => startEdit('experience')}
              onCancel={cancelEdit}
              canSave={!!draftExperience}
              onSave={() => { onSave({ experienceLevel: draftExperience }); setEditing(null); }}
            />
            {editing === 'experience' ? (
              <div className="flex flex-col gap-2.5 relative z-10">
                {LEVELS.map(l => (
                  <PickerRow key={l.id} selected={draftExperience === l.id} icon={l.icon} label={l.label} subtitle={l.description} onClick={() => setDraftExperience(l.id)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-300 relative z-10">
                {LEVELS.find(l => l.id === experienceLevel)?.label ?? <span className="text-zinc-600 italic">Not set</span>}
              </p>
            )}
          </Card>

          {/* Desired voice trait */}
          <Card>
            <SectionHeader
              label="Desired voice trait"
              editing={editing === 'traits'}
              onEdit={() => startEdit('traits')}
              onCancel={cancelEdit}
              canSave={true}
              onSave={() => { onSave({ desiredVoiceTraits: draftTrait ? [draftTrait] : [] }); setEditing(null); }}
            />
            {editing === 'traits' ? (
              <div className="flex flex-col gap-2.5 relative z-10">
                {TRAITS.map(t => (
                  <PickerRow
                    key={t.label}
                    selected={draftTrait === t.label}
                    icon={<span className="text-lg leading-none">{t.emoji}</span>}
                    label={t.label}
                    subtitle={t.subtitle}
                    color={TRAIT_COLORS[t.label].primary}
                    onClick={() => setDraftTrait(prev => prev === t.label ? null : t.label)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-300 relative z-10">
                {traitInfo ? <>{traitInfo.emoji} {traitInfo.label}</> : <span className="text-zinc-600 italic">Not set</span>}
              </p>
            )}
          </Card>

          {/* Goals */}
          <Card>
            <SectionHeader
              label="Goals (up to 3)"
              editing={editing === 'goals'}
              onEdit={() => startEdit('goals')}
              onCancel={cancelEdit}
              canSave={true}
              onSave={() => { onSave({ goals: draftGoals }); setEditing(null); }}
            />
            {editing === 'goals' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
                {GOALS.map(g => (
                  <PickerRow key={g.id} selected={draftGoals.includes(g.id)} icon={<span className="text-lg leading-none">{g.emoji}</span>} label={g.label} onClick={() => toggleDraftGoal(g.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 relative z-10">
                {goals.length === 0 && <span className="text-sm text-zinc-600 italic">Not set</span>}
                {goals.map(id => {
                  const g = GOALS.find(x => x.id === id);
                  if (!g) return null;
                  return (
                    <span key={id} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full text-zinc-300" style={{ background: 'rgba(33,232,255,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}>
                      {g.emoji} {g.label}
                    </span>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Voice barrier */}
          <Card>
            <SectionHeader
              label="Biggest voice barrier"
              editing={editing === 'barrier'}
              onEdit={() => startEdit('barrier')}
              onCancel={cancelEdit}
              canSave={!!draftBarrier}
              onSave={() => { onSave({ voiceBarrier: draftBarrier }); setEditing(null); }}
            />
            {editing === 'barrier' ? (
              <div className="flex flex-col gap-2.5 relative z-10">
                {CLUSTERS.map(c => (
                  <PickerRow key={c.id} selected={draftBarrier === c.id} icon={c.icon} label={c.label} subtitle={c.description} onClick={() => setDraftBarrier(c.id)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-300 relative z-10">
                {barrierInfo ? barrierInfo.label : <span className="text-zinc-600 italic">Not set</span>}
              </p>
            )}
          </Card>

          {/* Habit pairs */}
          <Card>
            <SectionHeader
              label="Habit pairs"
              editing={editing === 'habits'}
              onEdit={() => startEdit('habits')}
              onCancel={cancelEdit}
              canSave={true}
              onSave={() => { onSave({ habitPairs: draftPairs }); setEditing(null); }}
            />
            {editing === 'habits' ? (
              <div className="flex flex-col gap-5 relative z-10">
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
                {draftPairs.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {draftPairs.map((pair, i) => {
                      const daily = DAILY_HABITS.find(h => h.id === pair.daily);
                      const vocal = VOCAL_HABITS.find(h => h.id === pair.vocal);
                      return (
                        <div key={`${pair.daily}-${pair.vocal}`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(23,169,201,0.08)', border: '1px solid rgba(33,232,255,0.15)' }}>
                          <span className="text-[11.5px] text-zinc-300">{daily?.emoji} {daily?.label}</span>
                          <span className="text-zinc-600 text-[10px]">→</span>
                          <span className="text-[11.5px] text-zinc-300">{vocal?.emoji} {vocal?.label}</span>
                          <button onClick={() => removeDraftPair(i)} className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 relative z-10">
                {habitPairs.length === 0 && <span className="text-sm text-zinc-600 italic">Not set</span>}
                {habitPairs.map((pair, i) => {
                  const daily = DAILY_HABITS.find(h => h.id === pair.daily);
                  const vocal = VOCAL_HABITS.find(h => h.id === pair.vocal);
                  return (
                    <div key={i} className="flex items-center gap-2 text-[12.5px] text-zinc-300">
                      <span>{daily?.emoji ?? '🎯'} {daily?.label ?? pair.daily}</span>
                      <span className="text-zinc-600 text-[10px]">→</span>
                      <span>{vocal?.emoji ?? '🎙️'} {vocal?.label ?? pair.vocal}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
