import { Ritual } from './types';

export const EXERCISE_RITUALS: Ritual[] = [
  {
    id: 'laryngeal-massage',
    name: 'Laryngeal Massage & Release',
    category: 'Calibrate',
    duration: '4 mins',
    difficulty: 'Beginner',
    description: 'Relieves muscular tension surrounding the larynx cartilages. Perfect for eliminating throat constriction, allowing full range with minimum strain and preventing vocal fatigue.',
    instructionSteps: [
      'Locate your thyroid cartilage (the Adam\'s apple) gently with your thumb and index finger.',
      'Move slightly upward to find the hyoid bone, just above the larynx structure.',
      'Apply light circular pressure, massaging the muscles from top to bottom on each side.',
      'Gently nudge the thyroid cartilage side to side to ensure suspension is mobile and unconstrained.'
    ],
    primaryFocus: 'Larynx vertical mobility & suspensory muscle release',
    benefits: ['Lower phonatory threshold pressure', 'Eliminates throat tightness', 'Unlocks higher head register']
  },
  {
    id: 'humming-sirens',
    name: 'Pitch Sirens & Gliding Swells',
    category: 'Warm-up',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Smoothly stretches and elongates the cricothyroid and thyroarytenoid muscles without sudden impact. Connects chest and head voice registers gently.',
    instructionSteps: [
      'Pucker your lips softly and hum a quiet, lazy buzz sound in a comfortable low register.',
      'Slowly sweep your pitch upward while maintaining light tension in your abdominal wall.',
      'Glide all the way into your high head voice (like a gentle police siren) and back down.',
      'Keep the tongue relaxed on the floor of the mouth to maximize internal resonant space.'
    ],
    primaryFocus: 'Vocal fold elastic elongation',
    benefits: ['Bridges registration breaks', 'Increases vocal fold elasticity', 'Evens out subglottic airflow']
  },
  {
    id: 'straw-phonation-sovt',
    name: 'SOVT Backpressure Resonance',
    category: 'Resonance',
    duration: '5 mins',
    difficulty: 'Intermediate',
    description: 'Semi-Occluded Vocal Tract (SOVT) training. Backpressure reflects raw energy back to the glottis, lifting vocal folds slightly apart and optimizing acoustic energy transfer.',
    instructionSteps: [
      'Form your lips narrowly as if sipping from an invisible beverage straw.',
      'Gently emit an "oo" sound while blowing air steadily through the narrow opening.',
      'Execute moderate vocal glides upward and downward, feeling the pressure balance in your cheeks.',
      'Aim for a resonant buzzing behind your nose and teeth as if the throat is entirely asleep.'
    ],
    primaryFocus: 'Glottal pressure equalization',
    benefits: ['Reduces collision forces on vocal folds', 'Maximizes acoustic volume with minimal effort', 'Repairs breathy phonation']
  },
  {
    id: 'hydration-honey-cycle',
    name: 'Hydration & Mucosal Calibrator',
    category: 'Hydration',
    duration: '2 mins',
    difficulty: 'Beginner',
    description: 'Lubricates vocal folds to lower the Phonation Threshold Pressure (PTP). Deep hydration minimizes tissue friction and allows mucosal waves to ripple correctly.',
    instructionSteps: [
      'Sip lukewarm water slowly to match body temperature (cold water restricts cords).',
      'Optionally mix with organic raw honey to form a protective throat lining.',
      'Take 3 deep, humid steamy breaths from a warm water source or steaming cup.',
      'Perform light throat clears only if necessary, replacing them with a gentle "swallow".'
    ],
    primaryFocus: 'Mucosal friction reduction & tissue hydration',
    benefits: ['Lowers threshold phonation pressure', 'Reduces clearing triggers', 'Soothes dry vocal fold linings']
  },
  {
    id: 'yawn-sigh',
    name: 'Yawn-Sigh Deep Expansion',
    category: 'Relief',
    duration: '3 mins',
    difficulty: 'Beginner',
    description: 'Lowers a high larynx dynamically and lifts the soft palate (velum). Creates an acoustic megaphone shape behind your tongue to clear hyperfunctional squeeze.',
    instructionSteps: [
      'Open your mouth into a comfortable, wide yawn shape to lift the soft palate.',
      'Let the larynx descend naturally as you draw in a deep, cool breath.',
      'Release the air as a relaxed, sighing slide from high register down to the absolute lowest vocal fry.',
      'Feel the wide, hollow back-throat (pharynx) shape and maintain this lightness.'
    ],
    primaryFocus: 'Pharyngeal wall expansion & throat widening',
    benefits: ['Corrects choked tone delivery', 'Lifts the soft palate to block nasal leakage', 'Induces deep physical relaxation']
  }
];
