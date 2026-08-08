import {defineField, defineType} from 'sanity'

// Phrase library for the "Read Aloud" and "Free Speech" recording steps — shared by the
// onboarding baseline recorder and the voice analyzer (see src/lib/recordingPrompts.ts). One is
// picked at random for each recording attempt, so more entries here means more variety.
export default defineType({
  name: 'recordingPrompt',
  title: 'Recording Prompt',
  type: 'document',
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      description: 'Which recording step this phrase belongs to.',
      options: {
        list: [
          {title: 'Read Aloud (a passage to read verbatim)', value: 'read_aloud'},
          {title: 'Free Speech (a prompt to talk about)', value: 'free_speech'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'text',
      rows: 2,
      description: 'For Read Aloud, include the surrounding quote marks exactly as they should be shown.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Only affects editorial ordering in this list — phrases are picked at random in the app, not in this order.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'text', subtitle: 'kind'},
    prepare({title, subtitle}) {
      return {title, subtitle: subtitle === 'read_aloud' ? 'Read Aloud' : 'Free Speech'}
    },
  },
})
