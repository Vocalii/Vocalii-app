import { motion } from 'motion/react';

type Trait = 'Confident' | 'Calm' | 'Clear' | 'Warm' | 'Engaging';

type TraitAlignmentGlowProps = {
  trait: Trait;
  score: number; // 0-10, average of the two weekly trait questions
};

const TRAIT_CONFIG: Record<Trait, { emoji: string; glowColor: string; glowBg: string; border: string }> = {
  Confident: { emoji: '💪', glowColor: '#f59e0b', glowBg: 'rgba(245,158,11,0.22)', border: 'rgba(245,158,11,0.6)' },
  Calm:      { emoji: '🧘', glowColor: '#818cf8', glowBg: 'rgba(129,140,248,0.22)', border: 'rgba(129,140,248,0.6)' },
  Clear:     { emoji: '🎯', glowColor: '#21e8ff', glowBg: 'rgba(33,232,255,0.22)', border: 'rgba(33,232,255,0.6)' },
  Warm:      { emoji: '☀️', glowColor: '#f97316', glowBg: 'rgba(249,115,22,0.22)', border: 'rgba(249,115,22,0.6)' },
  Engaging:  { emoji: '⚡', glowColor: '#10b981', glowBg: 'rgba(16,185,129,0.22)', border: 'rgba(16,185,129,0.6)' },
};

function getGlowTier(score: number) {
  if (score <= 3) return { radius: 40, opacity: 0.2, pulseDuration: 2.5 };
  if (score <= 6) return { radius: 70, opacity: 0.4, pulseDuration: 1.8 };
  if (score <= 8) return { radius: 100, opacity: 0.6, pulseDuration: 1.4 };
  return { radius: 130, opacity: 0.85, pulseDuration: 1.0 };
}

export function getFeelingStatement(trait: string, score: number): string {
  if (score >= 8) return `Your voice felt very aligned with your ${trait} identity this week`;
  if (score >= 5) return `Your voice felt somewhat aligned with your ${trait} identity this week`;
  return `Your voice felt less aligned with your ${trait} identity this week`;
}

export function computeTraitScore(q1: number, q2: number): number {
  return Math.round(((q1 + q2) / 2) * 10) / 10;
}

export default function TraitAlignmentGlow({ trait, score }: TraitAlignmentGlowProps) {
  const config = TRAIT_CONFIG[trait];
  const { radius, opacity, pulseDuration } = getGlowTier(score);
  const diameter = radius * 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
      {/* Outer element resizes smoothly (0.8s) whenever `score` (and therefore `radius`) changes */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${config.glowBg} 0%, transparent 70%)`,
          boxShadow: `0 0 ${radius}px ${config.glowColor}`,
          border: `1px solid ${config.border}`,
          opacity,
        }}
        animate={{ width: diameter, height: diameter }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Inner element breathes between 90% and 100% of the target radius, independently of resize */}
        <motion.div
          className="w-full h-full rounded-full"
          animate={{ scale: [0.9, 1, 0.9] }}
          transition={{ duration: pulseDuration, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      </motion.div>
      <span className="relative z-10 text-4xl" style={{ lineHeight: 1 }}>
        {config.emoji}
      </span>
    </div>
  );
}
