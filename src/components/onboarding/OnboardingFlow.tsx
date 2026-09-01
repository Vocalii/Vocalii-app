import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingData, Role, ExperienceLevel, Goal, VoiceBarrier, HabitPair } from '../../types/onboarding';
import ScreenTerms from './ScreenTerms';
import AuthScreen from './AuthScreen';
import ScreenIntroVideo from './ScreenIntroVideo';
import WelcomeTransition from './WelcomeTransition';
import ScreenRole from './ScreenRole';
import ScreenExperience from './ScreenExperience';
import ScreenGoals from './ScreenGoals';
import ScreenVoiceBarriers from './ScreenVoiceBarriers';
import ScreenHabits from './ScreenHabits';
import ScreenVoiceTraits from './ScreenVoiceTraits';
import ScreenBaseline from './ScreenBaseline';

interface Props {
  onComplete: (data: OnboardingData) => void;
  onExitAuth?: () => void;
  skipAuth?: boolean;
  initialData?: { firstName?: string; lastName?: string };
}

const PROFILE_STEPS = 7; // steps 4–10

export default function OnboardingFlow({ onComplete, onExitAuth, skipAuth = false, initialData }: Props) {
  const [step, setStep] = useState(skipAuth ? 4 : 1);
  // Plays the "Welcome, {name}" / "Let's learn about you" animation beat between the intro video
  // (step 3) and the first profile question (step 4) — not a step of its own, just an overlay.
  const [showWelcome, setShowWelcome] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    role: null,
    experienceLevel: null,
    desiredVoiceTraits: [],
    voiceStatement: '',
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
  const profileStep = step - 3;
  const finish = () => onComplete(data);

  const renderStep = () => {
    if (step === 1) {
      return (
        <AuthScreen
          onSignUp={(firstName, lastName) => {
            setData(d => ({ ...d, firstName, lastName }));
            next();
          }}
          onBack={onExitAuth}
        />
      );
    }
    if (step === 2) {
      return <ScreenTerms onNext={next} onBack={back} />;
    }
    if (step === 3) {
      return <ScreenIntroVideo onNext={() => setShowWelcome(true)} onBack={back} />;
    }
    if (step === 4) {
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
    if (step === 5) {
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
    if (step === 6) {
      return (
        <ScreenVoiceTraits
          desiredTraits={data.desiredVoiceTraits}
          onChangeDesiredTraits={(desiredVoiceTraits) => setData(d => ({ ...d, desiredVoiceTraits }))}
          voiceStatement={data.voiceStatement}
          onChangeVoiceStatement={(voiceStatement) => setData(d => ({ ...d, voiceStatement }))}
          onNext={next}
          onBack={back}
          step={profileStep}
          totalSteps={PROFILE_STEPS}
        />
      );
    }
    if (step === 7) {
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
    if (step === 8) {
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
    if (step === 9) {
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
  };

  return (
    <AnimatePresence mode="wait">
      {showWelcome ? (
        <motion.div key="welcome" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <WelcomeTransition
            firstName={data.firstName}
            onDone={() => {
              setShowWelcome(false);
              next();
            }}
          />
        </motion.div>
      ) : (
        <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {renderStep()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
