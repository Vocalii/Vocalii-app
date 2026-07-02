import { useState } from 'react';
import { OnboardingData, Role, ExperienceLevel, Goal, HabitPair } from '../../types/onboarding';
import AuthScreen from './AuthScreen';
import ScreenRole from './ScreenRole';
import ScreenExperience from './ScreenExperience';
import ScreenGoals from './ScreenGoals';
import ScreenHabits from './ScreenHabits';
import ScreenVoiceTraits from './ScreenVoiceTraits';
import ScreenBaseline from './ScreenBaseline';

interface Props {
  onComplete: (data: OnboardingData) => void;
}

// Step 1 = auth, steps 2–7 = profile (1 of 6 … 6 of 6)
const PROFILE_STEPS = 6;

export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    role: null,
    experienceLevel: null,
    desiredVoiceTraits: [],
    voiceIdentity: null,
    customIdentity: '',
    goals: [],
    effortScore: 5,
    confidenceScore: 5,
    symptoms: [],
    habitPairs: [],
  });

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const profileStep = step - 1; // 1-based index within profile screens

  const finish = () => onComplete(data);

  if (step === 1) {
    return <AuthScreen onLogin={next} onBypass={next} />;
  }
  if (step === 2) {
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
  if (step === 3) {
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
  if (step === 4) {
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
  if (step === 5) {
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
  if (step === 6) {
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
      step={profileStep}
      totalSteps={PROFILE_STEPS}
    />
  );
}
