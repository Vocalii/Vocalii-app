import { useState, useEffect } from 'react';
import { ChevronLeft, Pencil, Check, X, Plus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Role, ExperienceLevel, Goal, VoiceBarrier, HabitPair } from '../types/onboarding';
import { ROLES } from './onboarding/ScreenRole';
import { LEVELS } from './onboarding/ScreenExperience';
import { GOALS } from './onboarding/ScreenGoals';
import { VOICE_STATEMENT_MAX_LENGTH } from './onboarding/ScreenVoiceTraits';
import { TRAITS, TRAIT_COLORS, TRAIT_QUOTES } from '../traitsData';
import { CLUSTERS } from './onboarding/ScreenVoiceBarriers';
import { DAILY_HABITS, VOCAL_HABITS } from '../habitsData';
import HabitPairPicker from './HabitPairPicker';

export interface ProfileUpdates {
  firstName?: string;
  lastName?: string;
  role?: Role | null;
  experienceLevel?: ExperienceLevel | null;
  desiredVoiceTraits?: string[];
  voiceStatement?: string;
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
  voiceStatement: string;
  goals: Goal[];
  voiceBarrier: VoiceBarrier | null;
  habitPairs: HabitPair[];
  onSave: (updates: ProfileUpdates) => void;
  onChangePassword: (newPassword: string) => Promise<string | null>;
}

type Section = 'identity' | 'role' | 'experience' | 'traits' | 'goals' | 'barrier' | 'habits' | null;

const SELECTED_STYLE = (color = '#21e8ff') => ({
  background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
  borderColor: `${color}50`,
  boxShadow: `0 0 20px ${color}18, inset 0 1px 0 ${color}18`,
});
const UNSELECTED_STYLE = { borderColor: 'rgba(39,39,42,0.8)' };


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

function CircleField({ icon, value, label, color, set, onClick }: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  set: boolean;
  onClick: () => void;
}) {
  const c = set ? color : '#52525b';
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 cursor-pointer group">
      <div
        className="w-[120px] h-[120px] rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
        style={{
          background: `radial-gradient(circle at 38% 32%, ${c}20 0%, ${c}08 100%)`,
          border: `1px solid ${c}40`,
          boxShadow: `0 0 20px ${c}14`,
        }}
      >
        <div style={{ color: c }}>{icon}</div>
      </div>
      <div className="flex flex-col items-center gap-0.5 max-w-[100px]">
        <span className="text-[11px] font-medium text-zinc-200 text-center truncate w-full">{value}</span>
        <span className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">{label}</span>
      </div>
    </button>
  );
}

function FieldModal({ title, onClose, onSave, canSave, saveLabel = 'Save', children }: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  canSave: boolean;
  saveLabel?: string;
  children: React.ReactNode;
}) {
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
        className="relative w-full max-w-md rounded-[28px] p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto"
        style={{ background: 'linear-gradient(160deg, #0f1319 0%, #0b0e14 100%)', border: '1px solid rgba(33,232,255,0.15)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.3), transparent)' }} />
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-mono tracking-widest uppercase text-[#21e8ff]/60">{title}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 transition-colors cursor-pointer">
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
        {children}
        <button
          onClick={onSave}
          disabled={!canSave}
          className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}
        >
          {saveLabel}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function ProfilePage({
  onBack, firstName, lastName, email, role, experienceLevel, desiredVoiceTraits, voiceStatement, goals, voiceBarrier, habitPairs, onSave, onChangePassword,
}: ProfilePageProps) {
  const [editing, setEditing] = useState<Section>(null);

  const [draftFirstName, setDraftFirstName] = useState(firstName);
  const [draftLastName, setDraftLastName] = useState(lastName);
  const [draftRole, setDraftRole] = useState<Role | null>(role);
  const [draftExperience, setDraftExperience] = useState<ExperienceLevel | null>(experienceLevel);
  const [draftTrait, setDraftTrait] = useState<string | null>(desiredVoiceTraits[0] ?? null);
  const [draftStatement, setDraftStatement] = useState(voiceStatement);
  const [traitPhase, setTraitPhase] = useState<'select' | 'statement'>('select');
  const [draftGoals, setDraftGoals] = useState<Goal[]>(goals);
  const [draftBarrier, setDraftBarrier] = useState<VoiceBarrier | null>(voiceBarrier);
  const [draftPairs, setDraftPairs] = useState<HabitPair[]>(habitPairs);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const startEdit = (section: Section) => {
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    setDraftRole(role);
    setDraftExperience(experienceLevel);
    setDraftTrait(desiredVoiceTraits[0] ?? null);
    setDraftStatement(voiceStatement);
    setTraitPhase('select');
    setDraftGoals(goals);
    setDraftBarrier(voiceBarrier);
    setDraftPairs(habitPairs);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setEditing(section);
  };
  const cancelEdit = () => setEditing(null);

  const canSaveIdentity = draftFirstName.trim().length > 0 && draftLastName.trim().length > 0 && !savingIdentity;

  const handleSaveIdentity = async () => {
    setPasswordError(null);
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
      if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    }

    onSave({ firstName: draftFirstName.trim(), lastName: draftLastName.trim() });

    if (newPassword) {
      setSavingIdentity(true);
      const error = await onChangePassword(newPassword);
      setSavingIdentity(false);
      if (error) { setPasswordError(error); return; }
    }

    setNewPassword('');
    setConfirmPassword('');
    setEditing(null);
  };

  const roleInfo = ROLES.find(r => r.id === role);
  const traitInfo = TRAITS.find(t => t.label === desiredVoiceTraits[0]);
  const barrierInfo = CLUSTERS.find(c => c.id === voiceBarrier);

  const toggleDraftGoal = (id: Goal) => {
    setDraftGoals(prev => prev[0] === id ? [] : [id]);
  };

  useEffect(() => {
    setDraftGoals(goals);
  }, [goals]);

  const goalsAreDirty = draftGoals.length !== goals.length || draftGoals.some(g => !goals.includes(g));

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

          {/* Identity — no card background, floats on the page */}
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center flex-shrink-0 text-3xl font-medium"
                  style={{ background: 'transparent', border: '1px solid rgba(23,169,201,0.4)', color: '#ffffff' }}
                >
                  {initials}
                </div>

                {editing === 'identity' ? (
                  <div className="flex flex-col items-start gap-2 min-w-0 w-full max-w-xs">
                    <div className="grid grid-cols-2 gap-2 w-full">
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
                    {email && <span className="text-[12px] text-zinc-600">{email}</span>}
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password (optional)"
                      className="h-10 rounded-xl px-3.5 text-[13px] text-zinc-200 placeholder-zinc-600 outline-none border border-zinc-800 focus:border-[#21e8ff]/40 transition-colors w-full"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="h-10 rounded-xl px-3.5 text-[13px] text-zinc-200 placeholder-zinc-600 outline-none border border-zinc-800 focus:border-[#21e8ff]/40 transition-colors w-full"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                    {passwordError && <span className="text-[11px] text-rose-400">{passwordError}</span>}
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-1 text-left">
                    <span className="text-xl font-medium text-white">{firstName} {lastName}</span>
                    {email && <span className="text-[13px] text-zinc-500">{email}</span>}
                  </div>
                )}
              </div>

              {editing === 'identity' ? (
                <div className="flex items-center gap-2">
                  <button onClick={cancelEdit} className="text-[11px] text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveIdentity}
                    disabled={!canSaveIdentity}
                    className="flex items-center gap-1.5 text-[11px] text-[#21e8ff] hover:text-white bg-[#17A9C9]/10 hover:bg-[#17A9C9]/20 border border-[#17A9C9]/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3 h-3" /> {savingIdentity ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit('identity')}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-900/60 border border-zinc-800/80 text-zinc-500 hover:text-[#21e8ff] hover:border-[#17A9C9]/40 transition-all duration-150 cursor-pointer flex-shrink-0"
                  aria-label="Edit basic info"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Your details — circle fields, click to edit */}
          <div className="flex flex-col items-start gap-1 mt-2">
            <h3 className="text-base font-light tracking-tight text-white">Your Details</h3>
            <span
              className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 px-2.5 py-1 rounded-full mt-2 mb-8"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Click The Circle To Change
            </span>
            <div className="flex items-start justify-around flex-wrap gap-6 w-full mb-12">
              <CircleField
                icon={roleInfo ? roleInfo.icon : <Plus className="w-5 h-5" />}
                value={roleInfo ? roleInfo.label : 'Not set'}
                label="Role"
                color={roleInfo?.color ?? '#52525b'}
                set={!!roleInfo}
                onClick={() => startEdit('role')}
              />
              <CircleField
                icon={LEVELS.find(l => l.id === experienceLevel)?.icon ?? <Plus className="w-5 h-5" />}
                value={LEVELS.find(l => l.id === experienceLevel)?.label ?? 'Not set'}
                label="Experience"
                color="#818cf8"
                set={!!experienceLevel}
                onClick={() => startEdit('experience')}
              />
              <CircleField
                icon={traitInfo ? <span className="text-2xl leading-none">{traitInfo.emoji}</span> : <Plus className="w-5 h-5" />}
                value={traitInfo ? traitInfo.label : 'Not set'}
                label="Voice trait"
                color={traitInfo ? TRAIT_COLORS[traitInfo.label].primary : '#52525b'}
                set={!!traitInfo}
                onClick={() => startEdit('traits')}
              />
              <CircleField
                icon={barrierInfo ? barrierInfo.icon : <Plus className="w-5 h-5" />}
                value={barrierInfo ? barrierInfo.label : 'Not set'}
                label="Barrier"
                color="#fb7185"
                set={!!barrierInfo}
                onClick={() => startEdit('barrier')}
              />
            </div>
          </div>

          {/* Goals — no card background, floats like Your details */}
          <div className="flex flex-col items-start gap-1 mt-2">
            <h3 className="text-base font-light tracking-tight text-white">Goals</h3>
            <span
              className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 px-2.5 py-1 rounded-full mt-2 mb-8"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Select 1
            </span>
            <div className="flex flex-wrap justify-start gap-5 w-full py-2">
              {GOALS.map((g, i) => {
                const selected = draftGoals.includes(g.id);
                return (
                  <motion.button
                    key={g.id}
                    onClick={() => toggleDraftGoal(g.id)}
                    initial={{ opacity: 0, scale: 0.6, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
                    transition={{
                      opacity: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' },
                      scale: { delay: i * 0.06, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
                      y: { delay: i * 0.06 + 0.5, duration: 3.5 + i * 0.2, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    whileHover={{ scale: 1.1, transition: { duration: 0.12, ease: 'easeOut' } }}
                    whileTap={{ scale: 0.95, transition: { duration: 0.08, ease: 'easeOut' } }}
                    className="flex flex-col items-center justify-center gap-2 w-32 h-32 rounded-full border transition-colors duration-300 select-none cursor-pointer"
                    style={selected ? {
                      background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(33,232,255,0.05) 100%)',
                      borderColor: 'rgba(33,232,255,0.45)',
                      boxShadow: '0 0 48px rgba(33,232,255,0.15), 0 0 16px rgba(33,232,255,0.1), inset 0 1px 0 rgba(33,232,255,0.2)',
                    } : {
                      background: 'rgba(19,22,28,0.8)',
                      borderColor: 'rgba(39,39,42,0.6)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                  >
                    <span className="text-3xl" style={{ filter: selected ? 'drop-shadow(0 0 10px rgba(33,232,255,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                      {g.emoji}
                    </span>
                    <span className="text-[11px] font-medium text-center leading-tight px-3" style={{ color: selected ? '#e4e4e7' : '#52525b' }}>
                      {g.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {goalsAreDirty && (
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => setDraftGoals(goals)} className="text-[11px] text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={() => onSave({ goals: draftGoals })}
                  className="flex items-center gap-1.5 text-[11px] text-[#21e8ff] hover:text-white bg-[#17A9C9]/10 hover:bg-[#17A9C9]/20 border border-[#17A9C9]/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Circle field edit modals */}
      <AnimatePresence>
        {editing === 'role' && (
          <FieldModal
            title="Role"
            onClose={cancelEdit}
            onSave={() => { onSave({ role: draftRole }); setEditing(null); }}
            canSave={!!draftRole}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLES.map(r => (
                <PickerRow key={r.id} selected={draftRole === r.id} icon={r.icon} label={r.label} color={r.color} onClick={() => setDraftRole(r.id)} />
              ))}
            </div>
          </FieldModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing === 'experience' && (
          <FieldModal
            title="Experience level"
            onClose={cancelEdit}
            onSave={() => { onSave({ experienceLevel: draftExperience }); setEditing(null); }}
            canSave={!!draftExperience}
          >
            <div className="flex flex-col gap-2.5">
              {LEVELS.map(l => (
                <PickerRow key={l.id} selected={draftExperience === l.id} icon={l.icon} label={l.label} subtitle={l.description} onClick={() => setDraftExperience(l.id)} />
              ))}
            </div>
          </FieldModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing === 'traits' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
            onClick={cancelEdit}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative w-full max-w-md rounded-[28px] p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto"
              style={{ background: 'linear-gradient(160deg, #0f1319 0%, #0b0e14 100%)', border: '1px solid rgba(33,232,255,0.15)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(33,232,255,0.3), transparent)' }} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {traitPhase === 'statement' && (
                    <button onClick={() => setTraitPhase('select')} className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 transition-colors cursor-pointer">
                      <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  )}
                  <p className="text-[9px] font-mono tracking-widest uppercase text-[#21e8ff]/60">
                    {traitPhase === 'select' ? 'Desired voice trait' : 'Personal statement'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {(['select', 'statement'] as const).map(p => (
                      <div key={p} className="w-5 h-1 rounded-full transition-all duration-300" style={{ background: (p === 'select' || traitPhase === 'statement') ? 'rgba(33,232,255,0.7)' : 'rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                  <button onClick={cancelEdit} className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 transition-colors cursor-pointer">
                    <X className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {traitPhase === 'select' ? (
                  <motion.div
                    key="trait-select"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-5"
                  >
                    <div className="flex flex-col gap-2.5">
                      {TRAITS.map(t => (
                        <PickerRow
                          key={t.label}
                          selected={draftTrait === t.label}
                          icon={<span className="text-lg leading-none">{t.emoji}</span>}
                          label={t.label}
                          subtitle={t.subtitle}
                          color={TRAIT_COLORS[t.label].primary}
                          onClick={() => { setDraftTrait(t.label); setTraitPhase('statement'); }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setTraitPhase('statement')}
                      disabled={!draftTrait}
                      className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}
                    >
                      Continue
                    </button>
                  </motion.div>
                ) : draftTrait && (
                  <motion.div
                    key="trait-statement"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-5"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                        style={{ color: TRAIT_COLORS[draftTrait].primary, background: TRAIT_COLORS[draftTrait].glow, border: `1px solid ${TRAIT_COLORS[draftTrait].border}` }}
                      >
                        <span className="text-sm leading-none">{TRAITS.find(t => t.label === draftTrait)?.emoji}</span>
                        {draftTrait}
                      </span>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">
                        (optional) I want my voice to:
                      </label>
                      <input
                        type="text"
                        value={draftStatement}
                        onChange={e => setDraftStatement(e.target.value.slice(0, VOICE_STATEMENT_MAX_LENGTH))}
                        maxLength={VOICE_STATEMENT_MAX_LENGTH}
                        placeholder={`e.g. "${TRAIT_QUOTES[draftTrait]}"`}
                        autoFocus
                        className="w-full h-11 rounded-xl px-4 text-[13px] text-center text-zinc-200 placeholder-zinc-600 outline-none transition-colors duration-150"
                        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${TRAIT_COLORS[draftTrait].border.replace('0.6', '0.3')}` }}
                      />
                      <span className="text-[9px] font-mono text-zinc-600">{draftStatement.length}/{VOICE_STATEMENT_MAX_LENGTH}</span>
                    </div>

                    <button
                      onClick={() => { onSave({ desiredVoiceTraits: [draftTrait], voiceStatement: draftStatement }); setEditing(null); }}
                      className="w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.15) 0%, rgba(23,169,201,0.08) 100%)', border: '1px solid rgba(33,232,255,0.3)', color: '#21e8ff' }}
                    >
                      Save
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing === 'barrier' && (
          <FieldModal
            title="Biggest voice barrier"
            onClose={cancelEdit}
            onSave={() => { onSave({ voiceBarrier: draftBarrier }); setEditing(null); }}
            canSave={!!draftBarrier}
          >
            <div className="flex flex-col gap-2.5">
              {CLUSTERS.map(c => (
                <PickerRow key={c.id} selected={draftBarrier === c.id} icon={c.icon} label={c.label} subtitle={c.description} onClick={() => setDraftBarrier(c.id)} />
              ))}
            </div>
          </FieldModal>
        )}
      </AnimatePresence>
    </div>
  );
}
