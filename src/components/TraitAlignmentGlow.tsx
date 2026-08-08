import { motion } from 'motion/react';
import { TRAITS, TRAIT_COLORS } from '../traitsData';

type Trait = 'Confident' | 'Calm' | 'Clear' | 'Warm' | 'Engaging';

type TraitAlignmentGlowProps = {
  trait: Trait;
  score: number; // 0-10, average of the two weekly trait questions
  // Counter-scale applied to the emoji only, to cancel out an ancestor CSS `scale()` transform
  // the caller may be using to resize the whole component (e.g. fitting it into a smaller card).
  // Lets the glow circle grow/shrink independently while the emoji stays visually constant-sized.
  // 1 (default) means no compensation — emoji scales along with everything else.
  emojiCounterScale?: number;
};

// Reads from the shared, Sanity-backed trait data (../traitsData.ts) rather than keeping its own
// copy of colors/emoji — this used to duplicate ScreenVoiceTraits.tsx's TRAIT_COLORS exactly.
function getTraitConfig(trait: Trait) {
  const color = TRAIT_COLORS[trait];
  const emoji = TRAITS.find(t => t.label === trait)?.emoji ?? '';
  return { emoji, glowColor: color.primary, glowBg: color.glow, border: color.border };
}

// Deliberately wide spread across tiers (radius, opacity, saturation) so a low week and a high
// week read as visibly different states at a glance, not a subtle gradient. Emoji size stays
// fixed across all tiers — only the glow behind it and its color intensity change.
interface GlowTier {
  radius: number;
  opacity: number;
  pulseDuration: number;
  saturate: number;
  brightness: number;
}

export function getGlowTier(score: number): GlowTier {
  if (score <= 3) return { radius: 70, opacity: 0.12, pulseDuration: 3.2, saturate: 0.35, brightness: 0.6 };
  if (score <= 6) return { radius: 70, opacity: 0.4, pulseDuration: 2.0, saturate: 0.75, brightness: 0.85 };
  if (score <= 8) return { radius: 70, opacity: 0.7, pulseDuration: 1.2, saturate: 1.15, brightness: 1.1 };
  return { radius: 70, opacity: 0.7, pulseDuration: 0.2, saturate: 1.4, brightness: 1.3 };
}

export function getTraitGlowColor(trait: Trait): string {
  return getTraitConfig(trait).glowColor;
}

// {{...}} marks the strongest-emphasis segment, **...** the secondary one — same markup
// convention HeroSection.tsx's parseTraitDescription uses for its trait-colored copy.
export function getFeelingStatement(trait: string, score: number): string {
  if (score >= 8) return `Your voice felt {{very aligned}} with your **${trait} identity** this week`;
  if (score >= 5) return `Your voice felt {{somewhat aligned}} with your **${trait} identity** this week`;
  return `Your voice felt {{less aligned}} with your **${trait} identity** this week`;
}

export function computeTraitScore(q1: number, q2: number): number {
  return Math.round(((q1 + q2) / 2) * 10) / 10;
}

export default function TraitAlignmentGlow({ trait, score, emojiCounterScale = 1 }: TraitAlignmentGlowProps) {
  const config = getTraitConfig(trait);
  const { radius, opacity, pulseDuration, saturate, brightness } = getGlowTier(score);
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
        }}
        animate={{ width: diameter, height: diameter, opacity }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Inner element breathes between 90% and 100% of the target radius, independently of resize */}
        <motion.div
          className="w-full h-full rounded-full"
          animate={{ scale: [0.9, 1, 0.9] }}
          transition={{ duration: pulseDuration, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      </motion.div>
      <motion.span
        className="relative z-10 text-8xl"
        style={{ lineHeight: 1, transform: `scale(${emojiCounterScale})` }}
        animate={{ filter: `saturate(${saturate}) brightness(${brightness})` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {config.emoji}
      </motion.span>
    </div>
  );
}
