import express from 'express';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { EXERCISE_RITUALS } from './src/ritualsData';

const PORT = 3000;

const RITUAL_ID_LIST = EXERCISE_RITUALS.map(r => r.id);

const COMMIT_PLAN_TOOL: Anthropic.Tool = {
  name: 'commit_ritual_plan',
  description: 'Finalize the tailored ritual plan. Call this ONLY after you have summarized your understanding of the event back to the user and the user has explicitly confirmed (e.g. said "yes" or "confirm") that you should generate the plan. Never call this on the same turn as the summary.',
  input_schema: {
    type: 'object',
    properties: {
      ritualIds: {
        type: 'array',
        items: { type: 'string', enum: RITUAL_ID_LIST },
        description: 'Ordered list of ritual ids to feature during the prep window, most important first.',
      },
      insight: {
        type: 'string',
        description: 'A short (2-3 sentence) human-readable explanation of why this plan fits the event.',
      },
    },
    required: ['ritualIds', 'insight'],
  },
};

const MOCK_QUESTIONS = [
  'How vocally demanding is this event — are you speaking the whole time, or more back-and-forth conversation?',
  'On a scale of nervous to confident, how are you feeling about it going in?',
];

const MOCK_SUMMARY = 'Here\'s what I\'m hearing: it sounds like a fairly demanding speaking event and you\'re feeling a little nervous about it. I\'d build a prep plan around warm-up and stability rituals to help you feel steady and consistent. Reply "confirm" or "yes" and I\'ll generate your personalized ritual plan.';

const CONFIRM_PATTERN = /\b(yes|yeah|yep|sure|confirm|confirmed|ok|okay)\b/i;

function getMockResponse(history: { role: 'user' | 'assistant'; content: string }[]) {
  const userMessages = history.filter(m => m.role === 'user');
  const userTurns = userMessages.length;

  if (userTurns <= MOCK_QUESTIONS.length) {
    return { type: 'message' as const, content: MOCK_QUESTIONS[userTurns - 1] };
  }

  if (userTurns === MOCK_QUESTIONS.length + 1) {
    return { type: 'message' as const, content: MOCK_SUMMARY, awaitingConfirmation: true };
  }

  const lastMessage = userMessages[userMessages.length - 1]?.content ?? '';
  if (!CONFIRM_PATTERN.test(lastMessage)) {
    return {
      type: 'message' as const,
      content: 'No problem — just reply "confirm" or "yes" whenever you\'re ready and I\'ll generate your plan.',
    };
  }

  const ritualIds = RITUAL_ID_LIST.slice(0, Math.min(3, RITUAL_ID_LIST.length));
  return {
    type: 'plan' as const,
    ritualIds,
    insight: '[DUMMY DATA — no ANTHROPIC_API_KEY set] This is a placeholder plan for testing the flow: a few warm-up and stability rituals to build consistency before your event.',
  };
}

function buildSystemPrompt(event: { title: string; date: string; location?: string | null }): string {
  const ritualList = EXERCISE_RITUALS
    .map(r => `- ${r.id}: "${r.name}" (${r.category}) — ${r.description}`)
    .join('\n');

  return `You are Vocalii's voice-prep coach. A user is preparing for an upcoming event and you need to understand it well enough to select a tailored set of daily vocal rituals for them to practice in the days leading up to it.

Event: "${event.title}" on ${event.date}${event.location ? ` at ${event.location}` : ''}.

Available rituals (choose only from this pool, referencing them by id):
${ritualList}

Ask at most 3-4 short, targeted questions — one at a time — about things like how vocally demanding the event is, how nervous or confident the user feels, and the format (e.g. solo speaking, conversation, performance). Keep each question brief and conversational.

Once you have enough understanding, do NOT call the tool yet. First send a short plain-text message that summarizes what you learned about the event in 1-2 sentences and explicitly asks the user to reply "confirm" or "yes" before you generate their plan. This message must start with the exact token [CONFIRM_REQUIRED] followed by a space, then your summary — never use this token at any other time. Wait for their reply.

Only after the user has explicitly confirmed (a message containing something like "yes" or "confirm") should you call the commit_ritual_plan tool with an ordered list of ritual ids and a short insight explaining the choice. If the user's reply doesn't clearly confirm, ask again or clarify — do not call the tool.`;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  app.post('/api/event-chat', async (req, res) => {
    try {
      const { event, history } = req.body as {
        event: { title: string; date: string; location?: string | null };
        history: { role: 'user' | 'assistant'; content: string }[];
      };

      if (!process.env.ANTHROPIC_API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        res.json(getMockResponse(history));
        return;
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: buildSystemPrompt(event),
        tools: [COMMIT_PLAN_TOOL],
        messages: history.map(m => ({ role: m.role, content: m.content })),
      });

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'commit_ritual_plan'
      );

      if (toolUse) {
        const input = toolUse.input as { ritualIds: string[]; insight: string };
        const validIds = input.ritualIds.filter(id => RITUAL_ID_LIST.includes(id));
        res.json({ type: 'plan', ritualIds: validIds, insight: input.insight });
        return;
      }

      const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
      const rawText = textBlock?.text ?? '';
      const awaitingConfirmation = rawText.startsWith('[CONFIRM_REQUIRED]');
      const content = awaitingConfirmation ? rawText.slice('[CONFIRM_REQUIRED]'.length).trim() : rawText;
      res.json({ type: 'message', content, awaitingConfirmation });
    } catch (err) {
      console.error('event-chat error:', err);
      res.status(500).json({ error: 'Failed to reach the AI service.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('Setting up Vite Dev Server Middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production static build...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on port ${PORT}`);
  });
}

startServer();
