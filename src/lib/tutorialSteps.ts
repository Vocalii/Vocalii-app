// Single source of truth for the 3 getting-started actions, shared between GettingStartedCard.tsx
// (the checklist) and TutorialVideoOverlay.tsx (the video walkthrough) so the two can never drift
// out of correspondence — same order, same wording, one video per step.
export const TUTORIAL_STEPS = [
  {
    key: 'checkin',
    label: 'Complete your first daily check-in',
    description: 'Open the Daily Vocal Protocol card and log how your voice feels today. Checking in daily lets Vocalii tailor your rituals to how you actually feel and gives you a real history to monitor your progress over time.',
    videoSrc: '/assets/videos/tutorial-checkin.mp4',
  },
  {
    key: 'ritual',
    label: 'Finish your first ritual',
    description: "After each check-in, Vocalii puts together a personalized routine based on what your voice needs that day. Work through each step to build better habits and make steady progress over time.",
    videoSrc: '/assets/videos/tutorial-ritual.mp4',
  },
  {
    key: 'analyzer',
    label: 'Try the Voice Analyzer',
    description: 'Record a short voice sample and see how your voice is performing across pitch, resonance, clarity, and stability. Understand what’s working, where you can improve, and how your voice is changing with consistent practice.',
    videoSrc: '/assets/videos/tutorial-analyzer.mp4',
  },
] as const;
