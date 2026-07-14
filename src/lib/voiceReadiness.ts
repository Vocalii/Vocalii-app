export type VoiceReadinessInput = {
  effort_score: number;      // 1-10, lower is better
  confidence_score: number;  // 1-10, higher is better
  symptoms: string[];
  habit_completed: boolean;
  acoustic_clarity?: number;  // 0-100
  acoustic_fatigue?: number;  // 0-100, lower is better
};

export type VoiceReadinessOutput = {
  score: number;
  label: string;
  contributing_factors: {
    effort: number;
    confidence: number;
    symptoms: number;
    habit: number;
    acoustic?: number;
  };
};

export function calculateVoiceReadiness(input: VoiceReadinessInput): VoiceReadinessOutput {
  const hasAcoustic =
    input.acoustic_clarity !== undefined && input.acoustic_fatigue !== undefined;

  const effortContrib = ((10 - input.effort_score) / 9) * 100;
  const confidenceContrib = (input.confidence_score / 10) * 100;
  const symptomsContrib = Math.max(0, 100 - input.symptoms.length * 15);
  const habitContrib = input.habit_completed ? 100 : 0;

  let score: number;
  let acousticContrib: number | undefined;

  if (hasAcoustic) {
    const clarityContrib = input.acoustic_clarity!;
    const fatigueContrib = 100 - input.acoustic_fatigue!;
    acousticContrib = Math.round((clarityContrib + fatigueContrib) / 2);

    score =
      effortContrib * 0.20 +
      confidenceContrib * 0.20 +
      symptomsContrib * 0.25 +
      habitContrib * 0.15 +
      clarityContrib * 0.15 +
      fatigueContrib * 0.15;
  } else {
    score =
      effortContrib * 0.30 +
      confidenceContrib * 0.30 +
      symptomsContrib * 0.25 +
      habitContrib * 0.15;
  }

  const roundedScore = Math.min(100, Math.max(0, Math.round(score)));

  let label: string;
  if (roundedScore >= 85) label = 'Voice Ready';
  else if (roundedScore >= 70) label = 'Steady';
  else if (roundedScore >= 50) label = 'Needs Support';
  else label = 'Rest & Recover';

  return {
    score: roundedScore,
    label,
    contributing_factors: {
      effort: Math.round(effortContrib),
      confidence: Math.round(confidenceContrib),
      symptoms: symptomsContrib,
      habit: habitContrib,
      ...(hasAcoustic ? { acoustic: acousticContrib } : {}),
    },
  };
}
