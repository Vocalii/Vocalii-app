// One-time migration: pushes the phrase libraries that used to live hardcoded in
// src/lib/recordingPrompts.ts into Sanity as real, editable `recordingPrompt` documents.
//
// Run with the Sanity CLI's own login (no token to manage):
//   cd studio && npx sanity exec seedRecordingPrompts.ts --with-user-token
//
// Safe to re-run — uses createOrReplace keyed on a deterministic _id derived from kind + index,
// so re-running after edits here just overwrites the same documents rather than duplicating them.

import {getCliClient} from 'sanity/cli'

const client = getCliClient()

const READ_ALOUD_PHRASES: string[] = [
  '"The early morning fog settled gently over the rolling hills, and the birds began to sing."',
  '"A gentle breeze drifted through the open window, carrying the scent of fresh rain and blooming flowers."',
  '"She walked along the quiet shoreline, watching the waves crash softly against the smooth grey stones."',
  '"The old wooden bridge creaked beneath their footsteps as they crossed over the slow-moving river."',
  '"Golden sunlight poured through the tall pine trees, warming the forest floor after a long, cold winter."',
  '"He poured a cup of coffee and settled into his favorite chair to read the morning newspaper."',
]

const FREE_SPEECH_PROMPTS: string[] = [
  'Tell us how you use your voice in your daily life.',
  'Describe a typical day in your work or routine.',
  "What's something you're looking forward to this week?",
  'Talk about a hobby or activity you genuinely enjoy.',
  'Explain how you like to unwind at the end of the day.',
  'Share a bit about what your ideal weekend looks like.',
]

async function run() {
  const transaction = client.transaction()
  READ_ALOUD_PHRASES.forEach((text, i) => {
    transaction.createOrReplace({
      _id: `recording-prompt-read-aloud-${i}`,
      _type: 'recordingPrompt',
      kind: 'read_aloud',
      text,
      sortOrder: i,
    })
  })
  FREE_SPEECH_PROMPTS.forEach((text, i) => {
    transaction.createOrReplace({
      _id: `recording-prompt-free-speech-${i}`,
      _type: 'recordingPrompt',
      kind: 'free_speech',
      text,
      sortOrder: i,
    })
  })
  await transaction.commit()
  console.log(`Seeded ${READ_ALOUD_PHRASES.length + FREE_SPEECH_PROMPTS.length} recording prompts.`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
