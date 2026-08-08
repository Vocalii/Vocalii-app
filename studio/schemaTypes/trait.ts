import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'trait',
  title: 'Voice Trait',
  type: 'document',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Stable identifier used throughout the app and database (profiles.desired_voice_traits, weekly_checkins). Do not change after users have selected this trait — kept as a plain string (not a slug).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      description: 'Short descriptor shown under the trait name on the onboarding picker card, e.g. "Impactful, powerful, authoritative".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'emoji',
      title: 'Emoji',
      type: 'string',
      validation: (Rule) => Rule.required().max(4),
    }),
    defineField({
      name: 'colorPrimary',
      title: 'Color — Primary',
      type: 'string',
      description: 'Hex color, e.g. #f59e0b. Used for the trait name, glow border tint, and emoji drop-shadow.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'colorGlow',
      title: 'Color — Glow',
      type: 'string',
      description: 'rgba() with low alpha, e.g. rgba(245,158,11,0.22). Used for background glows and radial gradients.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'colorBorder',
      title: 'Color — Border',
      type: 'string',
      description: 'rgba() with higher alpha, e.g. rgba(245,158,11,0.6). Used for selected-state borders.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Shown on the dashboard hero. Markup: {{word}} = strongest color/glow emphasis (the main trait word), **word** = secondary emphasis, same color dialed down. Plain text elsewhere.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'quote',
      title: 'Quote / Placeholder',
      type: 'string',
      description: 'Short first-person mantra. Used as the dashboard quote and as the "e.g. ..." placeholder text in the personal-statement input on onboarding and the profile page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'weeklyQuestion1',
      title: 'Weekly Report — Question 1',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'weeklyQuestion2',
      title: 'Weekly Report — Question 2',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Lower numbers appear first in the onboarding trait picker.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'subtitle'},
  },
})
