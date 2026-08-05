export type VoiceReadinessInput = {
  effort_score: number;      // 1-10, lower is better
  demand_score: number;      // 1-5, how much the voice was used today — lower is better
  symptoms: string[];
  acoustic_clarity?: number;  // 0-100
  acoustic_fatigue?: number;  // 0-100, lower is better
};

export type VoiceReadinessOutput = {
  score: number;
  label: string;
  contributing_factors: {
    effort: number;
    demand: number;
    symptoms: number;
    acoustic?: number;
  };
};

export function calculateVoiceReadiness(input: VoiceReadinessInput): VoiceReadinessOutput {
  const hasAcoustic =
    input.acoustic_clarity !== undefined && input.acoustic_fatigue !== undefined;

  const effortContrib = ((10 - input.effort_score) / 9) * 100;
  const demandContrib = ((5 - input.demand_score) / 4) * 100;
  const symptomsContrib = Math.max(0, 100 - input.symptoms.length * 15);

  let score: number;
  let acousticContrib: number | undefined;

  if (hasAcoustic) {
    const clarityContrib = input.acoustic_clarity!;
    const fatigueContrib = 100 - input.acoustic_fatigue!;
    acousticContrib = Math.round((clarityContrib + fatigueContrib) / 2);

    score =
      effortContrib * 0.20 +
      demandContrib * 0.20 +
      symptomsContrib * 0.30 +
      clarityContrib * 0.15 +
      fatigueContrib * 0.15;
  } else {
    score =
      effortContrib * 0.35 +
      demandContrib * 0.35 +
      symptomsContrib * 0.30;
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
      demand: Math.round(demandContrib),
      symptoms: symptomsContrib,
      ...(hasAcoustic ? { acoustic: acousticContrib } : {}),
    },
  };
}
