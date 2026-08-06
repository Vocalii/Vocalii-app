import { motion } from 'motion/react';

interface Props {
  step: number;
  totalSteps: number;
}

// Matches BaselineFlow.tsx's animated pill step indicator — the current step widens into a
// glowing pill, completed steps stay lit, upcoming ones stay dim — instead of onboarding's old
// static equal-width bars.
export default function OnboardingStepProgress({ step, totalSteps }: Props) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === step - 1 ? 20 : 6,
            background: i <= step - 1 ? '#21e8ff' : 'rgba(63,63,70,0.8)',
            boxShadow: i === step - 1 ? '0 0 8px rgba(33,232,255,0.75)' : 'none',
          }}
          transition={{ duration: 0.25 }}
          className="h-[5px] rounded-full"
        />
      ))}
      <span className="text-[9px] font-mono text-zinc-600 ml-1">{step} of {totalSteps}</span>
    </div>
  );
}
