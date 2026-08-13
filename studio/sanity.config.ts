import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import type {StructureResolver} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

// aiTone is a singleton — one fixed document, edited directly rather than picked from a list —
// so it gets its own top-level item instead of the default "AI Voice & Tone" list view.
const AI_TONE_SINGLETON_ID = 'ai-tone-singleton'

const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('ritual').title('Rituals'),
      S.documentTypeListItem('ritualMedia').title('Ritual Media'),
      S.documentTypeListItem('habit').title('Habits'),
      S.documentTypeListItem('trait').title('Traits'),
      S.documentTypeListItem('recordingPrompt').title('Recording Prompts'),
      S.divider(),
      S.listItem()
        .title('AI Voice & Tone')
        .id('aiTone')
        .child(
          S.document()
            .schemaType('aiTone')
            .documentId(AI_TONE_SINGLETON_ID)
        ),
    ])

export default defineConfig({
  name: 'default',
  title: 'Vocalii',

  projectId: 'j8ce9qq6',
  dataset: 'vocalii',

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
