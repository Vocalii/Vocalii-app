import { useState } from 'react';
import { OnboardingData, Role, ExperienceLevel, Goal, VoiceBarrier, HabitPair } from '../../types/onboarding';
import ScreenTerms from './ScreenTerms';
import AuthScreen from './AuthScreen';
import ScreenRole from './ScreenRole';
import ScreenExperience from './ScreenExperience';
import ScreenGoals from './ScreenGoals';
import ScreenVoiceBarriers from './ScreenVoiceBarriers';
import ScreenHabits from './ScreenHabits';
import ScreenVoiceTraits from './ScreenVoiceTraits';
import ScreenBaseline from './ScreenBaseline';

interface Props {
  onComplete: (data: OnboardingData) => void;
  onBypass?: () => void;
  skipAuth?: boolean;
  initialData?: { firstName?: string; lastName?: string };
}

const PROFILE_STEPS = 7; // steps 3–9

export default function OnboardingFlow({ onComplete, onBypass, skipAuth = false, initialData }: Props) {
  const [step, setStep] = useState(skipAuth ? 3 : 1);
  const [data, setData] = useState<OnboardingData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    role: null,
    experienceLevel: null,
    desiredVoiceTraits: [],
    voiceIdentity: null,
    customIdentity: '',
    goals: [],
    effortScore: 5,
    confidenceScore: 5,
    symptoms: [],
    voiceBarrier: null,
    habitPairs: [],
  });

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);
  const profileStep = step - 2;
  const finish = () => onComplete(data);

  if (step === 1) {
    return (
      <AuthScreen
        onSignUp={(firstName, lastName) => {
          setData(d => ({ ...d, firstName, lastName }));
          next();
        }}
        onBypass={onBypass ?? next}
      />
    );
  }
  if (step === 2) {
    return <ScreenTerms onNext={next} onBack={back} />;
  }
  if (step === 3) {
    return (
      <ScreenRole
        value={data.role}
        onChange={(role: Role) => setData(d => ({ ...d, role }))}
        onNext={next}
        onBack={back}
        step={profileStep}
        totalSteps={PROFILE_STEPS}
      />
    );
  }
  if (step === 4) {
    return (
      <ScreenExperience
        value={data.experienceLevel}
        onChange={(experienceLevel: ExperienceLevel) => setData(d => ({ ...d, experienceLevel }))}
        onNext={next}
        onBack={back}
        step={profileStep}
        totalSteps={PROFILE_STEPS}
      />
    );
  }
  if (step === 5) {
    return (
      <ScreenVoiceTraits
        desiredTraits={data.desiredVoiceTraits}
        onChangeDesiredTraits={(desiredVoiceTraits) => setData(d => ({ ...d, desiredVoiceTraits }))}
        onNext={next}
        onBack={back}
        step={profileStep}
        totalSteps={PROFILE_STEPS}
      />
    );
  }
  if (step === 6) {
    return (
      <ScreenGoals
        value={data.goals}
        onChange={(goals: Goal[]) => setData(d => ({ ...d, goals }))}
        onNext={next}
        onBack={back}
        step={profileStep}
        totalSteps={PROFILE_STEPS}
      />
    );
  }
  if (step === 7) {
    return (
      <ScreenVoiceBarriers
        value={data.voiceBarrier}
        onChange={(voiceBarrier: VoiceBarrier) => setData(d => ({ ...d, voiceBarrier }))}
        onNext={next}
        onBack={back}
        step={profileStep}
        totalSteps={PROFILE_STEPS}
      />
    );
  }
  if (step === 8) {
    return (
      <ScreenHabits
        value={data.habitPairs}
        onChange={(habitPairs: HabitPair[]) => setData(d => ({ ...d, habitPairs }))}
        onNext={next}
        onBack={back}
        step={profileStep}
        totalSteps={PROFILE_STEPS}
      />
    );
  }
  return (
    <ScreenBaseline
      onNext={finish}
      onBack={back}
      onBaseline={(metrics) => setData(d => ({ ...d, baselineMetrics: metrics }))}
      step={profileStep}
      totalSteps={PROFILE_STEPS}
    />
  );
}
