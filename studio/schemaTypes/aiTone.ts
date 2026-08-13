import {defineField, defineType} from 'sanity'

// Singleton — a single "AI Voice & Tone" document whose `tone` field is injected into every
// AI-generated message in the app (ritual-prep chat, weekly insight, voice-report insight,
// safety/escalation message). See src/lib/aiTone.ts, which fetches this and refreshes it on
// an interval so edits here take effect without a redeploy.
export default defineType({
  name: 'aiTone',
  title: 'AI Voice & Tone',
  type: 'document',
  fields: [
    defineField({
      name: 'tone',
      title: 'Tone instructions',
      type: 'text',
      rows: 6,
      description:
        'Describes how the AI should sound across the app — e.g. warm, encouraging, concise, ' +
        'never clinical or diagnostic. Written as an instruction to the AI, not as an example of ' +
        "its speech. This is layered on top of each message type's own structural rules (what " +
        'data to reference, required tokens/tool calls, safety constraints), which always take ' +
        'priority and cannot be overridden by this text.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {title: 'AI Voice & Tone'}
    },
  },
})
