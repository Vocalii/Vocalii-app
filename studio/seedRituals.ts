// One-time migration: pushes the rituals that used to live in the app's static
// src/ritualsData.ts into Sanity as real, editable `ritual` documents.
//
// Run with the Sanity CLI's own login (no token to manage):
//   cd studio && npx sanity exec seedRituals.ts --with-user-token
//
// Safe to re-run — uses createOrReplace keyed on a deterministic _id derived from ritualId,
// so re-running after edits here just overwrites the same documents rather than duplicating them.

import {getCliClient} from 'sanity/cli'

const client = getCliClient()

interface SeedRitual {
  ritualId: string
  name: string
  category: 'Ground' | 'Breathe' | 'Warm Up' | 'Release' | 'Resonate' | 'Build'
  duration: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  description: string
  instructionSteps: string[]
  primaryFocus: string
  benefits: string[]
}

const RITUALS: SeedRitual[] = [
  {
    ritualId: 'body-scan-grounding-reset',
    name: 'Body Scan Grounding Reset',
    category: 'Ground',
    duration: '4 mins',
    difficulty: 'Beginner',
    description:
      'A guided body scan that helps you slow down, notice tension, and prepare your body for easier voice use.',
    instructionSteps: [
      'Sit comfortably with both feet on the floor.',
      'Close your eyes or soften your gaze.',
      'Slowly scan your body from head to toe.',
      'Notice any areas of tightness or discomfort.',
      'Identify the areas that feel most tense.',
    ],
    primaryFocus: 'Builds awareness of tension before voice use.',
    benefits: [
      'Calms the nervous system',
      'Improves body awareness',
      'Identifies areas of tension',
      'Creates a grounded starting point',
      'Helps choose the right release exercise',
    ],
  },
  {
    ritualId: 'posture-voice-alignment-check',
    name: 'Posture + Voice Alignment Check',
    category: 'Ground',
    duration: '2 mins',
    difficulty: 'Beginner',
    description: 'A quick posture check to help your body support comfortable, effortless speaking.',
    instructionSteps: [
      'Stand or sit with both feet grounded.',
      'Align your head comfortably over your shoulders.',
      'Relax your shoulders and sit tall.',
      'Take an easy breath.',
      'Say a short phrase and notice how it feels.',
    ],
    primaryFocus: 'Finds a balanced posture for easier speaking.',
    benefits: [
      'Improves posture awareness',
      'Reduces unnecessary tension',
      'Supports easier breathing',
      'Prepares the body for speaking',
      'Promotes comfortable voice use',
    ],
  },
  {
    ritualId: 'mindful-movement-reset',
    name: 'Mindful Movement Reset',
    category: 'Ground',
    duration: '4 mins',
    difficulty: 'Beginner',
    description: 'Gentle movement that helps your body release tension and move more freely before speaking.',
    instructionSteps: [
      'Stand comfortably with relaxed knees.',
      'Turn gently to one side and notice your range.',
      'Repeat the turn while following your thumb with your eyes.',
      'Return to center and notice any difference.',
      'Repeat on the opposite side.',
    ],
    primaryFocus: 'Reduces tension through gentle body movement.',
    benefits: [
      'Improves body awareness',
      'Releases neck and shoulder tension',
      'Supports relaxed posture',
      'Encourages calm movement',
      'Prepares the body for voice use',
    ],
  },
  {
    ritualId: 'diaphragmatic-breathing-training',
    name: 'Diaphragmatic Breathing Training',
    category: 'Breathe',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Teaches relaxed breathing that supports your voice without unnecessary effort.',
    instructionSteps: [
      'Place one hand on your chest and one on your belly.',
      'Slowly breathe out while your belly moves inward.',
      'Let the inhale happen naturally.',
      'Repeat for five relaxed breaths.',
      'Add a soft sound on each exhale.',
    ],
    primaryFocus: 'Builds relaxed breath support for speaking.',
    benefits: [
      'Reduces upper-body tension',
      'Encourages natural breathing',
      'Supports easier voice production',
      'Calms the body',
      'Improves breath awareness',
    ],
  },
  {
    ritualId: 'breath-into-sound',
    name: 'Breath Into Sound',
    category: 'Breathe',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Practice connecting your breath to your voice so speaking feels smoother and more effortless.',
    instructionSteps: [
      'Take one relaxed breath.',
      'Exhale using each of the suggested sounds.',
      'Keep every sound smooth and steady.',
      'Stay relaxed through your throat and jaw.',
      'Stop if you feel any strain.',
    ],
    primaryFocus: 'Connects breath with easy voice production.',
    benefits: [
      'Builds breath and voice coordination',
      'Encourages steady airflow',
      'Reduces vocal strain',
      'Prepares the voice for speaking',
      'Improves vocal control',
    ],
  },
  {
    ritualId: 'easy-flow-reset',
    name: 'Easy Flow Reset',
    category: 'Breathe',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Encourages smooth airflow to reduce throat tension and make speaking feel easier.',
    instructionSteps: [
      'Hold a tissue or your hand in front of your mouth.',
      'Take an easy breath in.',
      'Exhale with a soft "whooo."',
      'Keep the airflow steady and relaxed.',
      'Repeat 5–10 times.',
    ],
    primaryFocus: 'Builds smooth, effortless airflow.',
    benefits: [
      'Reduces throat pressure',
      'Improves airflow awareness',
      'Resets the voice',
      'Supports easier speaking',
      'Helps prevent vocal fatigue',
    ],
  },
  {
    ritualId: 'flow-into-speech',
    name: 'Flow Into Speech',
    category: 'Breathe',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Carry easy airflow from simple sounds into words and short phrases for more natural speech.',
    instructionSteps: [
      'Start with a soft "whooo."',
      'Practice simple H sounds.',
      'Move into easy words.',
      'Practice short everyday phrases.',
      'Notice how your voice feels.',
    ],
    primaryFocus: 'Transfers easy airflow into speech.',
    benefits: [
      'Makes speech feel smoother',
      'Reduces vocal tension',
      'Improves phrase control',
      'Bridges exercises into conversation',
      'Builds speaking confidence',
    ],
  },
  {
    ritualId: 'straw-phonation-hierarchy',
    name: 'Straw Phonation Hierarchy',
    category: 'Warm Up',
    duration: '5 mins',
    difficulty: 'Beginner',
    description:
      'A gentle warm-up that uses a straw to reduce vocal effort while preparing your voice for speaking or singing.',
    instructionSteps: [
      'Blow gentle bubbles through the straw.',
      'Add an easy voiced sound.',
      'Practice smooth pitch glides.',
      'Try gentle sirens or a familiar melody.',
      'Stop if your voice feels strained.',
    ],
    primaryFocus: 'Warms up the voice with minimal effort.',
    benefits: [
      'Reduces vocal effort',
      'Improves vocal flexibility',
      'Supports healthy warm-ups',
      'Encourages smooth pitch changes',
      'Prepares the voice for use',
    ],
  },
  {
    ritualId: 'quick-voice-wake-up',
    name: 'Quick Voice Wake-Up',
    category: 'Warm Up',
    duration: '2 mins',
    difficulty: 'Beginner',
    description: 'Wake up your voice with gentle lip or tongue trills before speaking, singing, or presenting.',
    instructionSteps: [
      'Relax your lips, jaw, and tongue.',
      'Begin a gentle lip or tongue trill.',
      'Add an easy voice.',
      'Glide slightly up and down in pitch.',
      'Repeat several times.',
    ],
    primaryFocus: 'Quickly warms up the voice.',
    benefits: [
      'Coordinates breath and voice',
      'Warms up the vocal system',
      'Reduces vocal pushing',
      'Improves vocal flexibility',
      'Provides a quick voice reset',
    ],
  },
  {
    ritualId: 'find-your-buzz',
    name: 'Find Your Buzz',
    category: 'Resonate',
    duration: '3 mins',
    difficulty: 'Beginner',
    description:
      'Use gentle humming to find vibration in the front of your face and make your voice feel clearer and easier.',
    instructionSteps: [
      'Sit or stand comfortably.',
      'Close your lips gently and hum.',
      'Try humming with different expressions.',
      'Notice vibration around your lips, nose, or cheeks.',
      'Repeat 5–10 times with an easy sound.',
    ],
    primaryFocus: 'Finds forward vibration for easier voice use.',
    benefits: [
      'Encourages forward voice placement',
      'Reduces throat effort',
      'Builds vibration awareness',
      'Makes the voice feel lighter',
      'Prepares the voice for clear speech',
    ],
  },
  {
    ritualId: 'voice-forward-reset',
    name: 'Voice Forward Reset',
    category: 'Resonate',
    duration: '2 mins',
    difficulty: 'Beginner',
    description: 'Uses light "mimimi" sounds to bring the voice forward and reduce pressure in the throat.',
    instructionSteps: [
      'Relax your jaw and sit or stand tall.',
      'Say "mimimi" lightly five times.',
      'Glide downward on a long "miiiii."',
      'Repeat the glide three times.',
      'Say a short phrase with the same easy feeling.',
    ],
    primaryFocus: 'Moves the voice forward with less throat pressure.',
    benefits: [
      'Reduces throat pressure',
      'Encourages a forward voice',
      'Supports clearer speech',
      'Resets a tired voice',
      'Improves voice placement awareness',
    ],
  },
  {
    ritualId: 'speak-with-ease',
    name: 'Speak With Ease',
    category: 'Resonate',
    duration: '5 mins',
    difficulty: 'Intermediate',
    description: 'Moves from humming into everyday words and sentences so an easy voice carries into real speech.',
    instructionSteps: [
      'Begin with a gentle hum.',
      'Practice easy "mmm" and "nnn" sounds.',
      'Move into words beginning with M, N, or W.',
      'Practice short everyday phrases.',
      'Finish with a sentence you plan to use today.',
    ],
    primaryFocus: 'Carries an easy voice into everyday speech.',
    benefits: [
      'Improves real-world voice use',
      'Makes speech feel more natural',
      'Reduces effort during sentences',
      'Builds speaking confidence',
      'Supports clear communication',
    ],
  },
  {
    ritualId: 'shoulder-drop-reset',
    name: 'Shoulder Drop Reset',
    category: 'Release',
    duration: '2 mins',
    difficulty: 'Beginner',
    description: 'Releases shoulder and upper-body tension to create more space for comfortable breathing and speaking.',
    instructionSteps: [
      'Sit or stand with both feet grounded.',
      'Lift your shoulders gently as you inhale.',
      'Let them drop and soften as you exhale.',
      'Repeat five times.',
      'Finish with slow shoulder rolls in both directions.',
    ],
    primaryFocus: 'Releases shoulder tension before voice use.',
    benefits: [
      'Reduces shoulder tension',
      'Decreases upper-body bracing',
      'Supports easier breathing',
      'Prepares the body for speaking',
      'Provides a quick daily reset',
    ],
  },
  {
    ritualId: 'back-of-neck-release',
    name: 'Back-of-Neck Release',
    category: 'Release',
    duration: '2 mins',
    difficulty: 'Beginner',
    description: 'A gentle stretch that helps release tension along the back of the neck before speaking.',
    instructionSteps: [
      'Sit or stand tall with relaxed shoulders.',
      'Gently lower your chin toward your chest.',
      'Rest your hands lightly behind your head if comfortable.',
      'Take two slow breaths without pulling.',
      'Slowly return your head to center.',
    ],
    primaryFocus: 'Releases tension along the back of the neck.',
    benefits: [
      'Reduces neck tightness',
      'Improves comfort before speaking',
      'Encourages relaxed posture',
      'Supports easier breathing',
      'Builds awareness of neck tension',
    ],
  },
  {
    ritualId: 'neck-shoulder-stretch',
    name: 'Neck + Shoulder Stretch',
    category: 'Release',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'A gentle stretch that releases tension along the side of the neck and shoulders before voice use.',
    instructionSteps: [
      'Relax your shoulders.',
      'Hold one arm comfortably by your side or behind your back.',
      'Gently tilt your ear toward the opposite shoulder.',
      'Take two slow breaths.',
      'Repeat on the other side.',
    ],
    primaryFocus: 'Releases neck and shoulder tension.',
    benefits: [
      'Reduces neck tightness',
      'Releases shoulder tension',
      'Supports better posture',
      'Encourages relaxed breathing',
      'Prepares the body for speaking',
    ],
  },
  {
    ritualId: 'jaw-neck-release',
    name: 'Jaw + Neck Release',
    category: 'Release',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Relieves tension around the jaw and neck to make speaking feel more relaxed and natural.',
    instructionSteps: [
      'Relax your shoulders.',
      'Turn your head gently toward one shoulder.',
      'Lift your chin slightly until you feel a gentle stretch.',
      'Take two slow breaths.',
      'Repeat on the other side and finish with slow jaw circles.',
    ],
    primaryFocus: 'Releases jaw and neck tension.',
    benefits: [
      'Reduces jaw tightness',
      'Releases neck tension',
      'Supports clearer speech',
      'Encourages relaxed movement',
      'Improves awareness of jaw tension',
    ],
  },
  {
    ritualId: 'gentle-neck-mobility',
    name: 'Gentle Neck Mobility',
    category: 'Release',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Explore gentle neck movement to improve mobility without forcing or overstretching.',
    instructionSteps: [
      'Sit or stand with relaxed shoulders.',
      'Lower your chin toward your chest.',
      'Move your head slowly toward one shoulder.',
      'Return to center and repeat on the other side.',
      'Keep movements slow and comfortable.',
    ],
    primaryFocus: 'Improves gentle neck mobility.',
    benefits: [
      'Improves neck mobility',
      'Reduces stiffness',
      'Encourages mindful movement',
      'Supports relaxed posture',
      'Helps prevent over-stretching',
    ],
  },
  {
    ritualId: 'gentle-throat-base-tongue-release',
    name: 'Gentle Throat + Base-of-Tongue Release',
    category: 'Release',
    duration: '4 mins',
    difficulty: 'Beginner',
    description:
      'Uses gentle touch to release tension around the throat and tongue, helping your voice feel freer and less strained.',
    instructionSteps: [
      'Relax your shoulders.',
      'Massage the front and sides of your neck with light pressure.',
      'If comfortable, gently stretch your tongue forward.',
      'Add a soft breathy "ah" sound.',
      'Stop immediately if you feel discomfort.',
    ],
    primaryFocus: 'Releases throat and tongue tension.',
    benefits: [
      'Reduces throat tightness',
      'Releases tongue tension',
      'Supports easier voice production',
      'Reduces vocal strain',
      'Pairs well with other voice exercises',
    ],
  },
  {
    ritualId: 'open-throat-yawn-sigh',
    name: 'Open Throat Yawn-Sigh',
    category: 'Release',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Creates a relaxed, open feeling in the throat using a gentle yawn followed by an easy sigh.',
    instructionSteps: [
      'Relax your shoulders.',
      'Imagine the start of a gentle yawn.',
      'Breathe in with an open throat.',
      'Exhale with a soft sigh.',
      'Repeat five times without forcing the movement.',
    ],
    primaryFocus: 'Creates an open, relaxed throat.',
    benefits: [
      'Reduces throat tension',
      'Encourages easy voice release',
      'Supports vocal recovery',
      'Prepares the voice for speaking',
      'Builds awareness of relaxed voicing',
    ],
  },
  {
    ritualId: 'vocal-aerobics',
    name: 'Vocal Aerobics',
    category: 'Build',
    duration: '5 mins',
    difficulty: 'Intermediate',
    description: 'Improve pitch and volume control through gentle vocal exercises that build flexibility without strain.',
    instructionSteps: [
      'Begin with an easy breath and comfortable voice.',
      'Practice smooth pitch glides up and down.',
      'Explore gentle volume changes.',
      'Finish with a short spoken phrase.',
      'Stop if your voice feels strained or tired.',
    ],
    primaryFocus: 'Builds healthy vocal flexibility.',
    benefits: [
      'Improves pitch control',
      'Builds vocal flexibility',
      'Supports expressive speaking',
      'Develops vocal control',
      'Encourages healthy voice use',
    ],
  },
]

async function run() {
  const transaction = client.transaction()
  for (const r of RITUALS) {
    transaction.createOrReplace({
      _id: `ritual-${r.ritualId}`,
      _type: 'ritual',
      ...r,
    })
  }
  await transaction.commit()
  console.log(`Seeded ${RITUALS.length} rituals.`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
