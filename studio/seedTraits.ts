// One-time migration: pushes the voice traits that used to live hardcoded across
// src/components/onboarding/ScreenVoiceTraits.tsx, src/components/TraitAlignmentGlow.tsx, and
// src/lib/weeklyCheckin.ts (TRAIT_QUESTIONS) into Sanity as real, editable `trait` documents.
//
// Run with the Sanity CLI's own login (no token to manage):
//   cd studio && npx sanity exec seedTraits.ts --with-user-token
//
// Safe to re-run — uses createOrReplace keyed on a deterministic _id derived from label,
// so re-running after edits here just overwrites the same documents rather than duplicating them.

import {getCliClient} from 'sanity/cli'

const client = getCliClient()

interface SeedTrait {
  label: string
  subtitle: string
  emoji: string
  colorPrimary: string
  colorGlow: string
  colorBorder: string
  description: string
  quote: string
  weeklyQuestion1: string
  weeklyQuestion2: string
  sortOrder: number
}

const TRAITS: SeedTrait[] = [
  {
    label: 'Confident',
    subtitle: 'Impactful, powerful, authoritative',
    emoji: '💪',
    colorPrimary: '#f59e0b',
    colorGlow: 'rgba(245,158,11,0.22)',
    colorBorder: 'rgba(245,158,11,0.6)',
    description: 'You want a {{Confident}} voice that focuses on sounding **impactful**, **powerful**, and **authoritative**.',
    quote: 'I want to trust my voice.',
    weeklyQuestion1: 'How confident and powerful did your voice feel when you needed to make an impact this week?',
    weeklyQuestion2: 'How often did your voice feel like it supported your authority in conversations or presentations?',
    sortOrder: 0,
  },
  {
    label: 'Calm',
    subtitle: 'Calm, grounded, relaxed',
    emoji: '🧘',
    colorPrimary: '#818cf8',
    colorGlow: 'rgba(129,140,248,0.22)',
    colorBorder: 'rgba(129,140,248,0.6)',
    description: 'You want a {{Calm}} voice that focuses on feeling **grounded** and **relaxed**.',
    quote: 'I want to stay grounded while I speak.',
    weeklyQuestion1: 'How grounded and relaxed did your voice feel during stressful or high-pressure moments this week?',
    weeklyQuestion2: 'How often were you able to speak with ease rather than tension or urgency?',
    sortOrder: 1,
  },
  {
    label: 'Clear',
    subtitle: 'Clear, professional',
    emoji: '🎯',
    colorPrimary: '#21e8ff',
    colorGlow: 'rgba(33,232,255,0.22)',
    colorBorder: 'rgba(33,232,255,0.6)',
    description: 'You want a {{Clear}} voice that focuses on sounding **professional** and **easy to follow**.',
    quote: 'I want my message to come through effortlessly.',
    weeklyQuestion1: 'How clear and professional did your voice sound in your most important communication this week?',
    weeklyQuestion2: 'How often did your voice feel precise and easy to follow when you were speaking?',
    sortOrder: 2,
  },
  {
    label: 'Warm',
    subtitle: 'Warm, approachable, authentic',
    emoji: '☀️',
    colorPrimary: '#f97316',
    colorGlow: 'rgba(249,115,22,0.22)',
    colorBorder: 'rgba(249,115,22,0.6)',
    description: 'You want a {{Warm}} voice that focuses on feeling **approachable** and **authentic**.',
    quote: 'I want people to feel welcomed by my tone.',
    weeklyQuestion1: 'How warm and approachable did your voice feel in conversations this week?',
    weeklyQuestion2: 'How often did your voice feel genuinely like you — natural and unforced?',
    sortOrder: 3,
  },
  {
    label: 'Engaging',
    subtitle: 'Energetic, dynamic',
    emoji: '⚡',
    colorPrimary: '#10b981',
    colorGlow: 'rgba(16,185,129,0.22)',
    colorBorder: 'rgba(16,185,129,0.6)',
    description: 'You want an {{Engaging}} voice that focuses on being **energetic** and **dynamic** when you speak.',
    quote: 'I want my energy to be contagious.',
    weeklyQuestion1: 'How energetic and dynamic did your voice feel during conversations or presentations this week?',
    weeklyQuestion2: 'How well did your voice hold attention and keep people engaged this week?',
    sortOrder: 4,
  },
]

async function run() {
  const transaction = client.transaction()
  for (const t of TRAITS) {
    transaction.createOrReplace({
      _id: `trait-${t.label.toLowerCase()}`,
      _type: 'trait',
      ...t,
    })
  }
  await transaction.commit()
  console.log(`Seeded ${TRAITS.length} traits.`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
