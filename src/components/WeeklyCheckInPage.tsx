import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Goal } from '../types/onboarding';
import { GOALS } from './onboarding/ScreenGoals';
import { TRAITS, TRAIT_COLORS } from './onboarding/ScreenVoiceTraits';
import { GOAL_QUESTIONS, TRAIT_QUESTIONS, UNIVERSAL_QUESTIONS, REFLECTION_MAX_LENGTH } from '../lib/weeklyCheckin';

interface Props {
  onBack: () => void;
  userId: string | null;
  goal: Goal | null;
  trait: string | null;
  weekStart: string;
  onSubmitted: () => void;
}

function Slider({ label, value, onChange, accent }: { label: string; value: number; onChange: (n: number) => void; accent: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] text-zinc-300 leading-relaxed max-w-md">{label}</p>
        <span className="text-[11px] font-mono flex-shrink-0 ml-3" style={{ color: accent }}>{value} / 10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab"
        style={{
          background: `linear-gradient(to right, ${accent}60 0%, ${accent} ${value / 10 * 100}%, rgba(255,255,255,0.14) ${value / 10 * 100}%, rgba(255,255,255,0.14) 100%)`,
          filter: `drop-shadow(0 0 ${2 + (value / 10) * 6}px ${accent}${Math.round((0.15 + (value / 10) * 0.45) * 255).toString(16).padStart(2, '0')})`,
        }}
      />
    </div>
  );
}

export default function WeeklyCheckInPage({ onBack, userId, goal, trait, weekStart, onSubmitted }: Props) {
  const [goalQ1, setGoalQ1] = useState(5);
  const [goalQ2, setGoalQ2] = useState(5);
  const [traitQ1, setTraitQ1] = useState(5);
  const [traitQ2, setTraitQ2] = useState(5);
  const [confidence, setConfidence] = useState(5);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goalInfo = goal ? GOALS.find(g => g.id === goal) : null;
  const traitInfo = trait ? TRAITS.find(t => t.label === trait) : null;
  const traitColor = trait ? TRAIT_COLORS[trait] : null;
  const accent = '#17A9C9';

  const handleSubmit = async () => {
    if (!userId || !goal || !trait) return;
    setSubmitting(true);
    await supabase.from('weekly_checkins').upsert({
      user_id: userId,
      week_start: weekStart,
      goal_id: goal,
      goal_question_1: goalQ1,
      goal_question_2: goalQ2,
      trait,
      trait_question_1: traitQ1,
      trait_question_2: traitQ2,
      voice_confidence: confidence,
      reflection: reflection.trim() || null,
    }, { onConflict: 'user_id,week_start' });
    setSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="w-full pt-[88px] pb-10 select-none font-sans text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 md:px-12">
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

        {!goal || !trait ? (
          <div className="flex flex-col items-center text-center gap-4 py-16">
            <h2 className="text-xl font-light text-white">Set a goal and trait first</h2>
            <p className="text-sm text-zinc-500 max-w-sm">
              Your weekly check-in is tailored to the goal and voice trait you've selected. Head to your profile to set both, then come back.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-light tracking-tight text-white mb-2">Weekly Check-In</h2>
            <p className="text-sm text-zinc-400 max-w-xl leading-relaxed mb-10">
              A few quick reflections on your voice this past week.
            </p>

            <div className="flex flex-col gap-8">
              <div className="relative flex flex-col gap-5 py-7 px-6">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(23,169,201,0.1) 0%, rgba(33,232,255,0.04) 55%, transparent 100%)' }} />
                <div className="relative flex items-center gap-2">
                  <span className="text-lg">{goalInfo?.emoji}</span>
                  <h3 className="text-[13px] font-medium uppercase tracking-widest text-zinc-400">{goalInfo?.label ?? 'Your Goal'}</h3>
                </div>
                <div className="relative flex flex-col gap-5">
                  <Slider label={GOAL_QUESTIONS[goal][0]} value={goalQ1} onChange={setGoalQ1} accent={accent} />
                  <Slider label={GOAL_QUESTIONS[goal][1]} value={goalQ2} onChange={setGoalQ2} accent={accent} />
                </div>
              </div>

              <div className="relative flex flex-col gap-5 py-7 px-6">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(23,169,201,0.1) 0%, rgba(33,232,255,0.04) 55%, transparent 100%)' }} />
                <div className="relative flex items-center gap-2">
                  <span className="text-lg">{traitInfo?.emoji}</span>
                  <h3 className="text-[13px] font-medium uppercase tracking-widest text-zinc-400">{trait}</h3>
                </div>
                <div className="relative flex flex-col gap-5">
                  <Slider label={TRAIT_QUESTIONS[trait][0]} value={traitQ1} onChange={setTraitQ1} accent={traitColor?.primary ?? accent} />
                  <Slider label={TRAIT_QUESTIONS[trait][1]} value={traitQ2} onChange={setTraitQ2} accent={traitColor?.primary ?? accent} />
                </div>
              </div>

              <div className="relative flex flex-col gap-5 py-7 px-6">
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(23,169,201,0.1) 0%, rgba(33,232,255,0.04) 55%, transparent 100%)' }} />
                <h3 className="relative text-[13px] font-medium uppercase tracking-widest text-zinc-400">Overall</h3>
                <div className="relative">
                  <Slider label={UNIVERSAL_QUESTIONS.voiceConfidence} value={confidence} onChange={setConfidence} accent={accent} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium uppercase tracking-widest text-zinc-400">{UNIVERSAL_QUESTIONS.reflection}</label>
                <textarea
                  value={reflection}
                  onChange={e => setReflection(e.target.value.slice(0, REFLECTION_MAX_LENGTH))}
                  maxLength={REFLECTION_MAX_LENGTH}
                  rows={4}
                  placeholder="Anything you'd like to note..."
                  className="w-full resize-none rounded-xl px-4 py-3 text-[13px] text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors duration-150"
                  style={{ background: 'rgba(23,169,201,0.04)', border: '1px solid rgba(23,169,201,0.15)' }}
                />
                <span className="text-[9px] font-mono text-zinc-600 self-end">{reflection.length}/{REFLECTION_MAX_LENGTH}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-12 rounded-xl text-[11px] tracking-widest uppercase font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, rgba(23,169,201,0.22) 0%, rgba(33,232,255,0.10) 100%)', border: '1px solid rgba(33,232,255,0.5)', color: '#21e8ff' }}
              >
                {submitting ? 'Saving...' : 'Submit Check-In'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
