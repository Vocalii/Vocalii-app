import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'habit',
  title: 'Habit',
  type: 'document',
  fields: [
    defineField({
      name: 'habitId',
      title: 'Habit ID',
      type: 'string',
      description: 'Stable identifier used throughout the app and database (habit_pairs.daily_habit / .vocal_habit, habit_completions). Do not change after habits have been paired by users — kept as a plain string (not a slug) so it never silently re-derives from the label.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      description: 'Which side of the habit-pairing picker this belongs on.',
      options: {
        list: [
          {title: 'Daily habit (existing routine)', value: 'daily'},
          {title: 'Vocal habit (paired onto it)', value: 'vocal'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'emoji',
      title: 'Emoji',
      type: 'string',
      validation: (Rule) => Rule.required().max(4),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Lower numbers appear first within their kind.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'kind', media: 'emoji'},
    prepare({title, subtitle}) {
      return {title, subtitle: subtitle === 'daily' ? 'Daily habit' : 'Vocal habit'}
    },
  },
})
