// One-time migration: pushes the habit-pairing options that used to live hardcoded in
// src/components/onboarding/ScreenHabits.tsx into Sanity as real, editable `habit` documents.
//
// Run with the Sanity CLI's own login (no token to manage):
//   cd studio && npx sanity exec seedHabits.ts --with-user-token
//
// Safe to re-run — uses createOrReplace keyed on a deterministic _id derived from habitId,
// so re-running after edits here just overwrites the same documents rather than duplicating them.

import {getCliClient} from 'sanity/cli'

const client = getCliClient()

interface SeedHabit {
  habitId: string
  kind: 'daily' | 'vocal'
  label: string
  emoji: string
  sortOrder: number
}

const DAILY_HABITS: Omit<SeedHabit, 'kind' | 'sortOrder'>[] = [
  {habitId: 'morning_coffee', label: 'Morning coffee', emoji: '☕'},
  {habitId: 'brush_teeth', label: 'Brushing teeth', emoji: '🪥'},
  {habitId: 'morning_shower', label: 'Morning shower', emoji: '🚿'},
  {habitId: 'lunch_break', label: 'Lunch break', emoji: '🍽️'},
  {habitId: 'evening_walk', label: 'Evening walk', emoji: '🚶'},
  {habitId: 'bedtime_routine', label: 'Bedtime routine', emoji: '🌙'},
]

const VOCAL_HABITS: Omit<SeedHabit, 'kind' | 'sortOrder'>[] = [
  {habitId: 'drink_water', label: 'Drink a glass of water', emoji: '💧'},
  {habitId: 'vocal_hum', label: '2-min vocal hum', emoji: '🎵'},
  {habitId: 'lip_trill', label: 'Lip trill exercise', emoji: '💋'},
  {habitId: 'deep_breath', label: 'Deep breathing', emoji: '🌬️'},
  {habitId: 'jaw_stretch', label: 'Neck & jaw stretch', emoji: '🧘'},
  {habitId: 'silent_rest', label: 'Silent rest (2 min)', emoji: '🤫'},
]

const HABITS: SeedHabit[] = [
  ...DAILY_HABITS.map((h, i) => ({...h, kind: 'daily' as const, sortOrder: i})),
  ...VOCAL_HABITS.map((h, i) => ({...h, kind: 'vocal' as const, sortOrder: i})),
]

async function run() {
  const transaction = client.transaction()
  for (const h of HABITS) {
    transaction.createOrReplace({
      _id: `habit-${h.habitId}`,
      _type: 'habit',
      ...h,
    })
  }
  await transaction.commit()
  console.log(`Seeded ${HABITS.length} habits.`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
