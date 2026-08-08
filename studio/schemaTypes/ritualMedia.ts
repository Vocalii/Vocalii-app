import {defineField, defineType} from 'sanity'

// Reusable image-or-video slot, used for both a ritual's overview hero and its active-practice
// player. Only one of `image`/`video` is expected to be filled in, chosen via `mediaType`.
export default defineType({
  name: 'ritualMedia',
  title: 'Media',
  type: 'object',
  fields: [
    defineField({
      name: 'mediaType',
      title: 'Type',
      type: 'string',
      options: {list: ['image', 'video']},
      initialValue: 'image',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      hidden: ({parent}) => parent?.mediaType !== 'image',
    }),
    defineField({
      name: 'video',
      title: 'Video',
      type: 'file',
      options: {accept: 'video/*'},
      hidden: ({parent}) => parent?.mediaType !== 'video',
    }),
  ],
  preview: {
    select: {mediaType: 'mediaType', media: 'image'},
    prepare({mediaType, media}) {
      return {title: mediaType === 'video' ? 'Video' : 'Image', media}
    },
  },
})
