import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'ritual',
  title: 'Ritual',
  type: 'document',
  fields: [
    defineField({
      name: 'ritualId',
      title: 'Ritual ID',
      type: 'string',
      description: 'Stable identifier used throughout the app and database (e.g. daily_checkins.selected_ritual_ids, ritual_completions.ritual_id). Do not change after rituals have been assigned to users — kept as a plain string (not a slug) so it never silently re-derives from the name.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: ['Ground', 'Breathe', 'Warm Up', 'Release', 'Resonate', 'Build'],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'e.g. "3 mins"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty',
      type: 'string',
      options: {
        list: ['Beginner', 'Intermediate', 'Advanced'],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'instructionSteps',
      title: 'Instruction Steps',
      type: 'array',
      of: [{type: 'string'}],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'primaryFocus',
      title: 'Primary Focus',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'benefits',
      title: 'Benefits',
      type: 'array',
      of: [{type: 'string'}],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'overviewMedia',
      title: 'Overview Media',
      type: 'ritualMedia',
      description: 'Shown in the ritual hero when a user is browsing/viewing this ritual before starting it. Optional — falls back to the default animated icon when empty.',
    }),
    defineField({
      name: 'playerMedia',
      title: 'Player Media',
      type: 'ritualMedia',
      description: 'Shown in place of the animated visual while a user is actively doing this ritual. Optional — falls back to the default category animation when empty.',
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'category'},
  },
})
