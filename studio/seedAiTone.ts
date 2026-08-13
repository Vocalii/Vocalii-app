// One-time migration: creates the singleton "AI Voice & Tone" document in Sanity, seeded with the
// tone that was previously implicit/hardcoded across server.ts's AI prompts.
//
// Run with the Sanity CLI's own login (no token to manage):
//   cd studio && npx sanity exec seedAiTone.ts --with-user-token
//
// Safe to re-run — createOrReplace on a fixed _id, so re-running just overwrites the same
// document rather than duplicating it. Only run this once; after that, edit the tone directly
// in Studio (AI Voice & Tone) — re-running this script would overwrite those edits.

import {getCliClient} from 'sanity/cli'

const client = getCliClient()

const DEFAULT_TONE =
  'Warm, encouraging, and grounded — speak directly to the user ("you"/"your"). Keep language ' +
  'concise and non-clinical, never diagnostic. Stay positive but honest, grounded in the real ' +
  'data provided rather than generic filler.'

async function run() {
  await client.createOrReplace({
    _id: 'ai-tone-singleton',
    _type: 'aiTone',
    tone: DEFAULT_TONE,
  })
  console.log('Seeded AI Voice & Tone singleton document.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
