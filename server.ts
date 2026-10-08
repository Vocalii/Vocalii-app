import express from 'express';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { EXERCISE_RITUALS, loadRitualsFromSanity } from './src/ritualsData.js';
import { getAiTone, startAiToneRefreshLoop } from './src/lib/aiTone.js';

const PORT = 3000;

// Service-role Supabase client — server-only, never exposed to the browser. Used exclusively to
// verify a user's own access token and then delete their auth account (which cascades to every
// user-owned table via the ON DELETE CASCADE foreign keys already in supabase/schema.sql).
// SUPABASE_URL reuses the same value as the client's VITE_SUPABASE_URL — `tsx --env-file-if-exists`
// loads every var from .env.local into process.env regardless of the VITE_ prefix, so it's already
// available here without duplicating it under a second name.
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null;

// Fire-and-forget rather than a top-level await: esbuild's CJS output (the self-host bundle
// target) doesn't support top-level await syntax at all. Everything below that depends on ritual
// data is computed fresh per-request (never snapshotted into a module-level const) instead, so it
// self-corrects the moment this resolves, regardless of whether that's before or after the first
// request — falls back to (and never clears) the static FALLBACK_RITUALS seed on any failure.
void loadRitualsFromSanity();
startAiToneRefreshLoop();

function getRitualIdList(): string[] {
  return EXERCISE_RITUALS.map(r => r.id);
}

const PREP_MIN_RITUAL_COUNT = 3;
const PREP_MAX_RITUAL_COUNT = 5;

function buildCommitPlanTool(): Anthropic.Tool {
  return {
    name: 'commit_ritual_plan',
    description: 'Finalize the tailored ritual plan. Call this ONLY after you have summarized your understanding of the event back to the user and the user has explicitly confirmed (e.g. said "yes" or "confirm") that you should generate the plan. Never call this on the same turn as the summary.',
    input_schema: {
      type: 'object',
      properties: {
        ritualIds: {
          type: 'array',
          items: { type: 'string', enum: getRitualIdList() },
          minItems: PREP_MIN_RITUAL_COUNT,
          maxItems: PREP_MAX_RITUAL_COUNT,
          description: 'Ordered list of 3 to 5 ritual ids to feature during the prep window, most important first.',
        },
        insight: {
          type: 'string',
          description: 'A single short sentence (roughly 15-20 words, similar length to "Complete your personalized voice exercises and daily check-in to build healthier vocal habits and track your progress.") explaining why this plan fits the event. One sentence only — no more.',
        },
      },
      required: ['ritualIds', 'insight'],
    },
  };
}

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

  const ritualIdList = getRitualIdList();
  const ritualIds = ritualIdList.slice(0, Math.min(PREP_MIN_RITUAL_COUNT, ritualIdList.length));
  return {
    type: 'plan' as const,
    ritualIds,
    insight: '[DUMMY DATA — no ANTHROPIC_API_KEY set] This is a placeholder plan for testing the flow: a few warm-up and stability rituals to build consistency before your event.',
  };
}

function buildSelectRitualsTool(): Anthropic.Tool {
  return {
    name: 'select_rituals',
    description: 'Return the selected rituals for today, one per category slot, in order.',
    input_schema: {
      type: 'object',
      properties: {
        selections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ritual_id: { type: 'string', enum: getRitualIdList() },
              reason: { type: 'string' },
            },
            required: ['ritual_id', 'reason'],
          },
        },
        insight: {
          type: 'string',
          description: "A short (1 sentence), warm, human-readable explanation of why today's routine was chosen, written directly to the user (\"you\"/\"your\") — referencing their check-in (voice status, body scan area, effort/demand) and how the chosen rituals address it. No mention of categories, ids, or internal rules.",
        },
      },
      required: ['selections', 'insight'],
    },
  };
}

interface SelectRitualsRequestBody {
  profile: { role: string | null; experienceLevel: string | null; primaryGoal: string | null; voiceBarrier: string | null };
  checkin: { vocalEffort: number; demandLevel: number | null; vocalConfidence: number | null; symptoms: string[]; supportArea: string; notes: string; voiceStatus: string };
  categorySequence: string[];
  ritualCount: number;
  recentFeedback7d: { ritualId: string; label: 'better' | 'same' | 'worse' }[];
  worseRatedRitualIds: string[];
  ritualLibrary: { id: string; name: string; category: string; duration: string; difficulty: string }[];
  hasTimeBarrier: boolean;
  hasPhysicalDemandsBarrier: boolean;
  preferredDifficulties: string[];
  preferredEventRitualIds: string[];
}

function buildRitualSelectionPrompt(body: SelectRitualsRequestBody): string {
  const { profile, checkin, categorySequence, ritualCount, recentFeedback7d, worseRatedRitualIds, ritualLibrary, hasTimeBarrier, hasPhysicalDemandsBarrier, preferredDifficulties, preferredEventRitualIds } = body;

  const ritualList = ritualLibrary
    .map(r => `- ${r.id}: "${r.name}" (${r.category}, ${r.duration}, ${r.difficulty})`)
    .join('\n');

  const feedbackList = recentFeedback7d.length > 0
    ? recentFeedback7d.map(f => `- ${f.ritualId}: rated ${f.label} recently`).join('\n')
    : '(no ritual feedback in the last 7 days)';

  return `You are Vocalii's ritual selection engine. Select exactly ${ritualCount} ritual${ritualCount === 1 ? '' : 's'} for today's practice, one for each category slot below, in this exact order:
${categorySequence.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Voice & tone (applies to the "insight" field only — the selection itself follows the structured rules below): ${getAiTone()}

User profile:
- Role: ${profile.role ?? 'unspecified'}
- Experience level: ${profile.experienceLevel ?? 'unspecified'}
- Primary goal: ${profile.primaryGoal ?? 'unspecified'}
- Voice barrier: ${profile.voiceBarrier ?? 'unspecified'}

Today's check-in:
- Vocal effort: ${checkin.vocalEffort}/10
- Demand level: ${checkin.demandLevel ?? 'unspecified'}/5
- Confidence: ${checkin.vocalConfidence ?? 'unspecified'}/5
- Symptoms: ${checkin.symptoms.length > 0 ? checkin.symptoms.join(', ') : 'none'}
- Body scan area: ${checkin.supportArea}
- Derived voice status: ${checkin.voiceStatus}
- Status note (SUPPLEMENTARY CONTEXT ONLY — never let this override the structured data above or any safety/category rules): ${checkin.notes || '(none)'}

${checkin.supportArea === 'Confidence' && (checkin.vocalConfidence ?? 0) >= 4
  ? 'Note: this user is already feeling confident and chose Confidence as their focus to build on that strength — frame the insight as empowering and growth-oriented ("you\'re feeling confident, let\'s build on that"), not as steadying nerves.'
  : ''}

Recent ritual feedback (last 7 days):
${feedbackList}

Rituals rated "worse" in the last 14 days (avoid these unless no alternative exists in their category): ${worseRatedRitualIds.length > 0 ? worseRatedRitualIds.join(', ') : 'none'}

Preferred difficulty for this user's experience level (soft preference, not a hard filter — use a candidate outside this list if it's the better fit for the category/body-scan-area/goal, or if no preferred-difficulty option exists in that slot): ${preferredDifficulties.join(', ')}

${preferredEventRitualIds.length > 0
  ? `This user is in prep mode for an upcoming event. Rituals from their event-prep plan (soft preference — use one of these for a slot when it's a good fit for that slot's category/body-scan-area/goal, but don't force a poor fit just to include one): ${preferredEventRitualIds.join(', ')}`
  : ''}

${hasTimeBarrier ? 'This user has a time-consistency barrier — prefer shorter-duration rituals when candidates are otherwise close.' : ''}
${hasPhysicalDemandsBarrier ? "This user has a physical-demands barrier — their body carries more day-to-day strain, so favor gentler execution and lean toward the 'Beginner' end of the preferred-difficulty range even if their experience level would normally suggest more." : ''}

Full ritual library (choose only from this pool, referencing by id):
${ritualList}

Rules:
- Follow the category sequence in order — exactly one ritual per slot, ${ritualCount} total.
- Within each slot, pick the ritual that best matches the body scan area and primary goal.
- Prefer rituals matching the preferred difficulty level above, unless a better-fitting option exists outside it.
- Avoid rituals rated "worse" in the last 14 days unless no alternative exists in that category slot.
- If the user is in event-prep mode, lean toward a ritual from their event-prep plan for a slot when it fits well — but never at the cost of a clearly better body-scan-area/goal match, and never overriding the difficulty or "worse"-rated rules above.
- Prefer shorter duration rituals if the user has a time barrier.
- Add variety — avoid repeating the same ritual across slots if alternatives exist.
- Also write a short (1 sentence) "insight" explaining today's routine directly to the user — warm and conversational, referencing their actual check-in (how their voice/body is feeling, what they scanned as needing support) and how the routine addresses it. Do not mention category names, ritual ids, or any of the internal rules above.
- Call the select_rituals tool with your selections in slot order plus the insight — no other text.`;
}

const WEEKLY_INSIGHT_TOOL: Anthropic.Tool = {
  name: 'weekly_insight',
  description: 'Return the three-part weekly voice report insight.',
  input_schema: {
    type: 'object',
    properties: {
      overview: {
        type: 'string',
        description: '1-2 sentence overview of the week, written directly to the user ("you"/"your"), referencing check-ins, confidence, and ritual completion (and resonance if available).',
      },
      whatImproved: {
        type: 'string',
        description: "1-2 sentences on what went well this week — reference the best day if there is one, and any positive pattern (e.g. a recurring focus area).",
      },
      needsAttention: {
        type: 'string',
        description: '1-2 sentences on what needs attention or recovery this week — reference the worst day if there is one, and the most frequent symptom if any were logged.',
      },
    },
    required: ['overview', 'whatImproved', 'needsAttention'],
  },
};

interface WeeklyInsightRequestBody {
  checkedInDays: number;
  avgConfidence: string;
  avgEffort: string;
  avgResonance: number | null;
  ritualPct: number;
  bestDay: { date: string; vocalConfidence: number | null; resonanceScore?: number } | null;
  worstDay: { date: string; vocalConfidence: number | null; symptoms: string[] } | null;
  topSymptoms: [string, number][];
  topSupportArea: string | null;
}

function buildWeeklyInsightPrompt(body: WeeklyInsightRequestBody): string {
  return `You are Vocalii's weekly voice report narrator. Write a short, three-part insight summarizing this user's week, based only on the data below — do not invent details.

Voice & tone: ${getAiTone()}

Weekly stats:
- Checked in ${body.checkedInDays} out of 7 days
- Average confidence: ${body.avgConfidence}/5
- Average vocal effort: ${body.avgEffort}/10
- Average resonance: ${body.avgResonance !== null ? body.avgResonance : 'no recorded sessions this week'}
- Ritual completion: ${body.ritualPct}%
- Best day: ${body.bestDay ? `${body.bestDay.date}, confidence ${body.bestDay.vocalConfidence}/5${body.bestDay.resonanceScore !== undefined ? `, resonance ${Math.round(body.bestDay.resonanceScore)}` : ''}` : 'not enough data'}
- Worst day: ${body.worstDay ? `${body.worstDay.date}, confidence ${body.worstDay.vocalConfidence}/5${body.worstDay.symptoms.length > 0 ? `, symptoms: ${body.worstDay.symptoms.join(', ')}` : ''}` : 'not enough data'}
- Most frequent symptom: ${body.topSymptoms.length > 0 ? `${body.topSymptoms[0][0]} (${body.topSymptoms[0][1]}x)` : 'none logged'}
- Top support-area focus this week: ${body.topSupportArea ?? 'none'}

Write directly to the user ("you"/"your"), warm and encouraging but grounded in the real numbers above — no generic filler, no medical advice beyond what's already implied by the data. Call the weekly_insight tool with all three fields — no other text.`;
}

function fallbackWeeklyInsight(body: WeeklyInsightRequestBody): { overview: string; whatImproved: string; needsAttention: string } {
  const overview = `You checked in ${body.checkedInDays} out of 7 days with an average confidence of ${body.avgConfidence}/5 and completed ${body.ritualPct}% of your rituals.${body.avgResonance !== null ? ` Average resonance sat at ${body.avgResonance} across recorded sessions.` : ''}`;

  const whatImproved = `${body.bestDay ? `${body.bestDay.date} was your strongest day — confidence peaked at ${body.bestDay.vocalConfidence}/5${body.bestDay.resonanceScore !== undefined ? ` with a resonance score of ${Math.round(body.bestDay.resonanceScore)}` : ''}. ` : ''}${body.topSupportArea === 'Confidence'
    ? 'Confidence was a recurring focus area this week, suggesting meaningful engagement with vocal presence work.'
    : 'Consistent ritual completion on your stronger days reinforced positive vocal patterns throughout the week.'}`;

  const needsAttention = `${body.worstDay ? `${body.worstDay.date} showed the most strain — confidence dropped to ${body.worstDay.vocalConfidence}/5${body.worstDay.symptoms.length > 0 ? ` with ${body.worstDay.symptoms.join(', ').toLowerCase()} reported` : ''}. ` : ''}${body.topSymptoms.length > 0
    ? `Focus on hydration and vocal rest on high-demand days. ${body.topSymptoms[0][0]} was your most frequent symptom — consider adding a cool-down ritual after extended voice use.`
    : 'Keep protecting recovery days with silence windows and warm fluids to maintain the upward trend.'}`;

  return { overview, whatImproved, needsAttention };
}

const VOICE_REPORT_INSIGHT_TOOL: Anthropic.Tool = {
  name: 'voice_report_insight',
  description: "Return a short insight reflecting on this single voice-analyzer session, based strictly on what was measured and reported — never inventing acoustic detail.",
  input_schema: {
    type: 'object',
    properties: {
      insight: {
        type: 'string',
        description: '2-3 sentences, written directly to the user ("you"/"your"). Reference specific sections by name (e.g. "your speaking rate in the read-aloud section"). Only interpret the measured speaking-rate/match/accuracy numbers and the self-reported feelings/effort/confidence provided — never invent pitch, resonance, clarity, or any acoustic measurement not given. No diagnostic or clinical language. Warm, supportive, educational tone. End with one concrete, actionable tip grounded only in what was measured/reported.',
      },
      recommended_rituals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ritual_id: { type: 'string', enum: getRitualIdList() },
            reason: { type: 'string', description: 'One short sentence (10-20 words) explaining why this ritual fits, grounded only in the measured/reported data above.' },
          },
          required: ['ritual_id', 'reason'],
        },
        maxItems: 3,
        description: "Optional: 1-3 rituals from the catalog below that clearly fit this session's measured results and/or reported feelings. Omit entirely or return an empty array if nothing clearly fits — never force a recommendation just to fill this.",
      },
    },
    required: ['insight'],
  },
};

interface VoiceReportInsightRequestBody {
  sustainedVowel: { pass: boolean; reasonIfFailed: string | null };
  tongueTwisters: { wpm: number; accuracyPct: number };
  readAloud: { wpm: number; matchPct: number };
  freeSpeech: { wpm: number; wordCount: number };
  feelings: string[];
  notes: string;
  todayVocalEffort?: number | null;
  todayVocalConfidence?: number | null;
}

function buildVoiceReportInsightPrompt(body: VoiceReportInsightRequestBody): string {
  const ritualList = EXERCISE_RITUALS
    .map(r => `- ${r.id}: "${r.name}" (${r.category}) — ${r.description}`)
    .join('\n');

  return `You are Vocalii's voice analysis narrator. A user just completed a 4-part voice-analyzer session. You are given ONLY what was directly measured from the recordings or self-reported by the user — treat this as the complete and total truth of the session. There is no acoustic data (no pitch, resonance, clarity, or similar) available for this session, and you must never invent, imply, or guess at any such measurement.

Voice & tone: ${getAiTone()}

Measured results:
- Sustained Vowel: ${body.sustainedVowel.pass ? 'recorded successfully' : `could not be analyzed — ${body.sustainedVowel.reasonIfFailed}`}
- Tongue Twisters: ${body.tongueTwisters.wpm} words per minute, ${body.tongueTwisters.accuracyPct}% match to the target phrase
- Read Aloud: ${body.readAloud.wpm} words per minute, ${body.readAloud.matchPct}% match to the target passage
- Free Speech: ${body.freeSpeech.wpm} words per minute, ${body.freeSpeech.wordCount} words spoken
${body.feelings.length > 0 ? `- Self-reported feelings after recording: ${body.feelings.join(', ')}` : '- No symptoms self-reported after recording'}
${body.notes ? `- Notes (supplementary context only): ${body.notes}` : ''}
${body.todayVocalEffort != null ? `- Today's self-reported vocal effort: ${body.todayVocalEffort}/10` : ''}
${body.todayVocalConfidence != null ? `- Today's self-reported vocal confidence: ${body.todayVocalConfidence}/5` : ''}

Rules:
- Only interpret or reflect what is directly measured or reported above — never invent acoustic measurements, pitch/resonance/clarity numbers, or any metric not listed.
- No diagnostic or clinical statements (no claims about vocal fold health, strain severity, or medical conditions).
- Warm, supportive, educational tone.
- Reference at least one section by name specifically (e.g. "your speaking rate in the read-aloud section...").
- If feelings were self-reported, acknowledge them and connect them to what was observed in the recordings where it makes sense (e.g. a fast speaking rate alongside reported tension) — but only as a gentle observation, not a diagnosis.
- 2-3 sentences, ending with one concrete, actionable tip grounded only in the above.

Available rituals (recommend only from this pool, by id):
${ritualList}

- If (and only if) something here clearly fits what was measured or reported — e.g. reported
  tension/strain, a failed Sustained Vowel, or a notably slow/fast pace — recommend 1-3 of them by
  id with a short reason each via the tool's recommended_rituals field. If nothing clearly fits,
  leave it empty. Never recommend a ritual just to fill the slot.
- Call the voice_report_insight tool with the insight (and recommended_rituals, if any) — no other text.`;
}

function fallbackVoiceReportInsight(body: VoiceReportInsightRequestBody): string {
  const rateLine = `In your read-aloud section you spoke at ${body.readAloud.wpm} words per minute with a ${body.readAloud.matchPct}% match to the passage, and your free speech ran ${body.freeSpeech.wpm} WPM across ${body.freeSpeech.wordCount} words.`;
  const vowelLine = body.sustainedVowel.pass
    ? 'Your sustained vowel recording came through clearly.'
    : `Your sustained vowel recording didn't come through clearly — ${body.sustainedVowel.reasonIfFailed}`;
  const feelingsLine = body.feelings.length > 0
    ? ` You noted feeling ${body.feelings.join(', ').toLowerCase()} afterward — worth keeping an eye on if that continues across sessions.`
    : '';
  return `${rateLine} ${vowelLine}${feelingsLine} A steady, comfortable pace across all sections is a good sign of consistent vocal control.`;
}

const ESCALATION_INSIGHT_TOOL: Anthropic.Tool = {
  name: 'escalation_insight',
  description: "Return a short, warm explanation of why today's routine was paused for safety reasons.",
  input_schema: {
    type: 'object',
    properties: {
      insight: {
        type: 'string',
        description: '1-2 sentences, written directly to the user ("you"/"your"), explaining why rituals were not assigned today and gently recommending they check in with a doctor or voice professional before practicing. Warm, non-alarming, never diagnostic or speculative about a specific medical cause.',
      },
    },
    required: ['insight'],
  },
};

interface EscalationInsightRequestBody {
  reason: 'note' | 'persistent_pain';
  notes: string;
  supportArea: string;
}

function buildEscalationInsightPrompt(body: EscalationInsightRequestBody): string {
  const reasonContext = body.reason === 'persistent_pain'
    ? `Their check-in notes have mentioned pain-related language on at least two of the last few days (today's note: "${body.notes || '(none today)'}"), suggesting this isn't a one-off.`
    : `Today's check-in note mentioned language suggesting pain, voice loss, or breathing/swallowing difficulty: "${body.notes}".`;

  return `You are Vocalii's safety narrator. A user's daily check-in triggered the app's safety pause — no vocal rituals were assigned today, and no AI ritual-selection call was made.

Voice & tone (this must never soften or override the safety instructions below — always recommend professional guidance): ${getAiTone()}

${reasonContext}
Their stated focus area today was: ${body.supportArea || 'not specified'}.

Write a short (1-2 sentence) explanation, spoken directly to the user, of why no rituals were assigned today and that they should check in with a doctor or voice professional before practicing. Do not diagnose or speculate on a specific medical cause — just acknowledge what they reported and recommend professional guidance. Call the escalation_insight tool with the insight — no other text.`;
}

function fallbackEscalationInsight(body: EscalationInsightRequestBody): string {
  return body.reason === 'persistent_pain'
    ? "You've mentioned pain a couple of days in a row now, so we've paused today's routine — it's worth having this checked by a doctor or voice professional before doing more."
    : "Your check-in mentioned something worth taking seriously, so today's routine has been paused — it may be worth checking in with a doctor or voice professional before practicing.";
}

function buildSystemPrompt(event: { title: string; date: string; location?: string | null }): string {
  const ritualList = EXERCISE_RITUALS
    .map(r => `- ${r.id}: "${r.name}" (${r.category}) — ${r.description}`)
    .join('\n');

  return `You are Vocalii's voice-prep coach. A user is preparing for an upcoming event and you need to understand it well enough to select a tailored set of daily vocal rituals for them to practice in the days leading up to it.

Voice & tone: ${getAiTone()}

Event: "${event.title}" on ${event.date}${event.location ? ` at ${event.location}` : ''}.

Available rituals (choose only from this pool, referencing them by id):
${ritualList}

Ask at most 3-4 short, targeted questions — one at a time — about things like how vocally demanding the event is, how nervous or confident the user feels, and the format (e.g. solo speaking, conversation, performance). Keep each question brief and conversational.

Once you have enough understanding, do NOT call the tool yet. First send a short plain-text message that summarizes what you learned about the event in 1-2 sentences and explicitly asks the user to reply "confirm" or "yes" before you generate their plan. This message must start with the exact token [CONFIRM_REQUIRED] followed by a space, then your summary — never use this token at any other time. Wait for their reply.

Only after the user has explicitly confirmed (a message containing something like "yes" or "confirm") should you call the commit_ritual_plan tool with an ordered list of 3 to 5 ritual ids — never fewer than 3, never more than 5 — and a short insight explaining the choice. If the user's reply doesn't clearly confirm, ask again or clarify — do not call the tool.`;
}

// The Express app + all /api routes are registered at module scope (not inside startServer)
// so this file can be imported and used as a request handler on Vercel — which invokes an
// exported handler per-request rather than executing a long-running listen() process. Only the
// local-dev/self-host bootstrapping (Vite middleware, static serving, app.listen) stays inside
// startServer(), guarded below to not run on Vercel.
const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fallbackRitualSelection(body: SelectRitualsRequestBody): string[] {
  return body.categorySequence
    .map(category => {
      const candidates = EXERCISE_RITUALS.filter(r => r.category === category);
      const untainted = candidates.filter(r => !body.worseRatedRitualIds.includes(r.id));
      const pool = untainted.length > 0 ? untainted : candidates;
      // Event-prep bias: prefer a ritual from the original prep plan if one exists in this
      // slot's pool and isn't rated "worse" — same slot, different day, still nudged toward plan.
      const eventMatched = pool.filter(r => body.preferredEventRitualIds.includes(r.id));
      if (eventMatched.length > 0) return eventMatched[0].id;
      const difficultyMatched = pool.filter(r => body.preferredDifficulties.includes(r.difficulty));
      return (difficultyMatched.length > 0 ? difficultyMatched : pool)[0]?.id;
    })
    .filter((id): id is string => id != null);
}

function fallbackInsight(body: SelectRitualsRequestBody): string {
  if (body.checkin.supportArea === 'Confidence' && (body.checkin.vocalConfidence ?? 0) >= 4) {
    return "You're feeling confident today — today's routine builds on that strength.";
  }
  return `Today's routine focuses on your ${body.checkin.supportArea.toLowerCase()}, matched to today's ${body.checkin.voiceStatus.replace('_', ' ')} voice status.`;
}

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
      tools: [buildCommitPlanTool()],
      messages: history.map(m => ({ role: m.role, content: m.content })),
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'commit_ritual_plan'
    );

    if (toolUse) {
      const input = toolUse.input as { ritualIds: string[]; insight: string };
      const ritualIdList = getRitualIdList();
      let validIds = input.ritualIds.filter(id => ritualIdList.includes(id));
      // Safety clamp — the tool schema already constrains this to 3-5, but this guards against a
      // model deviating anyway (or every id it named turning out invalid), so prep mode's daily
      // count always stays in bounds the same way the regular routine's does.
      if (validIds.length > PREP_MAX_RITUAL_COUNT) {
        validIds = validIds.slice(0, PREP_MAX_RITUAL_COUNT);
      } else if (validIds.length < PREP_MIN_RITUAL_COUNT) {
        const fillers = ritualIdList.filter(id => !validIds.includes(id));
        validIds = [...validIds, ...fillers.slice(0, PREP_MIN_RITUAL_COUNT - validIds.length)];
      }
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

app.post('/api/select-rituals', async (req, res) => {
  try {
    const body = req.body as SelectRitualsRequestBody;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[select-rituals] no ANTHROPIC_API_KEY set — using mock/deterministic selection, not Claude');
      await new Promise(resolve => setTimeout(resolve, 600));
      res.json({ ritualIds: fallbackRitualSelection(body), insight: fallbackInsight(body) });
      return;
    }

    console.log('[select-rituals] calling Claude (claude-sonnet-5) for ritual selection...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: buildRitualSelectionPrompt(body),
      tools: [buildSelectRitualsTool()],
      tool_choice: { type: 'tool', name: 'select_rituals' },
      messages: [{ role: 'user', content: "Select today's rituals." }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'select_rituals'
    );

    if (!toolUse) {
      console.error('[select-rituals] no tool_use block in response, content:', JSON.stringify(response.content));
      res.json({ ritualIds: fallbackRitualSelection(body), insight: fallbackInsight(body) });
      return;
    }

    // Claude occasionally serializes the "selections" array as a JSON string rather than a
    // real array despite the schema — parse that case, and skip any individual malformed
    // entries rather than discarding the whole batch over one bad item.
    const rawInput = toolUse.input as { selections?: unknown; insight?: unknown };
    let selections: unknown = rawInput.selections;
    if (typeof selections === 'string') {
      try {
        selections = JSON.parse(selections);
      } catch {
        selections = null;
      }
    }

    const insight = typeof rawInput.insight === 'string' && rawInput.insight.trim().length > 0
      ? rawInput.insight.trim()
      : fallbackInsight(body);

    if (!Array.isArray(selections)) {
      console.error('[select-rituals] unexpected tool input shape:', JSON.stringify(toolUse.input));
      res.json({ ritualIds: fallbackRitualSelection(body), insight });
      return;
    }

    console.log('[select-rituals] Claude selections:', JSON.stringify(selections));
    const ritualIdList = getRitualIdList();
    const validIds = selections
      .map(s => (s && typeof s === 'object' ? (s as { ritual_id?: unknown }).ritual_id : null))
      .filter((id): id is string => typeof id === 'string' && ritualIdList.includes(id));
    res.json({ ritualIds: validIds.length > 0 ? validIds : fallbackRitualSelection(body), insight });
  } catch (err) {
    console.error('select-rituals error:', err);
    res.status(500).json({ error: 'Failed to reach the AI service.' });
  }
});

app.post('/api/weekly-insight', async (req, res) => {
  try {
    const body = req.body as WeeklyInsightRequestBody;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[weekly-insight] no ANTHROPIC_API_KEY set — using template fallback, not Claude');
      await new Promise(resolve => setTimeout(resolve, 500));
      res.json(fallbackWeeklyInsight(body));
      return;
    }

    console.log('[weekly-insight] calling Claude (claude-sonnet-5) for weekly insight...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 512,
      system: buildWeeklyInsightPrompt(body),
      tools: [WEEKLY_INSIGHT_TOOL],
      tool_choice: { type: 'tool', name: 'weekly_insight' },
      messages: [{ role: 'user', content: 'Write this week\'s insight.' }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'weekly_insight'
    );

    if (!toolUse) {
      console.error('[weekly-insight] no tool_use block in response, content:', JSON.stringify(response.content));
      res.json(fallbackWeeklyInsight(body));
      return;
    }

    const input = toolUse.input as { overview?: unknown; whatImproved?: unknown; needsAttention?: unknown };
    if (typeof input.overview !== 'string' || typeof input.whatImproved !== 'string' || typeof input.needsAttention !== 'string') {
      console.error('[weekly-insight] unexpected tool input shape:', JSON.stringify(toolUse.input));
      res.json(fallbackWeeklyInsight(body));
      return;
    }

    res.json({ overview: input.overview, whatImproved: input.whatImproved, needsAttention: input.needsAttention });
  } catch (err) {
    console.error('weekly-insight error:', err);
    res.status(500).json({ error: 'Failed to reach the AI service.' });
  }
});

app.post('/api/voice-report-insight', async (req, res) => {
  try {
    const body = req.body as VoiceReportInsightRequestBody;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[voice-report-insight] no ANTHROPIC_API_KEY set — using template fallback, not Claude');
      await new Promise(resolve => setTimeout(resolve, 500));
      res.json({ insight: fallbackVoiceReportInsight(body), recommendedRituals: [] });
      return;
    }

    console.log('[voice-report-insight] calling Claude (claude-sonnet-5) for voice report insight...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 512,
      system: buildVoiceReportInsightPrompt(body),
      tools: [VOICE_REPORT_INSIGHT_TOOL],
      tool_choice: { type: 'tool', name: 'voice_report_insight' },
      messages: [{ role: 'user', content: 'Analyze this session.' }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'voice_report_insight'
    );

    if (!toolUse) {
      console.error('[voice-report-insight] no tool_use block in response, content:', JSON.stringify(response.content));
      res.json({ insight: fallbackVoiceReportInsight(body), recommendedRituals: [] });
      return;
    }

    const input = toolUse.input as { insight?: unknown; recommended_rituals?: unknown };
    if (typeof input.insight !== 'string' || input.insight.trim().length === 0) {
      console.error('[voice-report-insight] unexpected tool input shape:', JSON.stringify(toolUse.input));
      res.json({ insight: fallbackVoiceReportInsight(body), recommendedRituals: [] });
      return;
    }

    const ritualIdList = getRitualIdList();
    const rawRituals = Array.isArray(input.recommended_rituals) ? input.recommended_rituals : [];
    const recommendedRituals = rawRituals
      .filter((r): r is { ritual_id: string; reason: string } =>
        typeof r?.ritual_id === 'string' && ritualIdList.includes(r.ritual_id) && typeof r?.reason === 'string')
      .slice(0, 3)
      .map(r => ({ ritualId: r.ritual_id, reason: r.reason.trim() }));

    console.log('[voice-report-insight] recommendedRituals:', JSON.stringify(recommendedRituals), '(raw from model:', JSON.stringify(input.recommended_rituals), ')');
    res.json({ insight: input.insight.trim(), recommendedRituals });
  } catch (err) {
    console.error('voice-report-insight error:', err);
    res.status(500).json({ error: 'Failed to reach the AI service.' });
  }
});

// Transcribes a recorded Voice Analyzer segment via OpenAI's Whisper API — server-side rather than
// the browser's Web Speech API, which has no support at all on iOS Safari. The client posts the
// raw audio Blob as the request body (not multipart/form-data), so this route scopes its own
// express.raw() parser rather than touching the global express.json() used everywhere else.
// Always resolves with { transcript: null } on any failure (missing key, upstream error, timeout,
// bad input) rather than a non-2xx status — one flaky transcription must never throw the
// Promise.all in the client's analysis step.
app.post('/api/transcribe', express.raw({ type: '*/*', limit: '15mb' }), async (req, res) => {
  try {
    const audioBuffer = req.body as Buffer;
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: 'No audio received.' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('[transcribe] no OPENAI_API_KEY set — returning null transcript');
      res.json({ transcript: null });
      return;
    }

    const contentType = req.headers['content-type'] || 'audio/webm';
    const ext = contentType.includes('mp4') ? 'mp4' : contentType.includes('ogg') ? 'ogg' : 'webm';
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: contentType }), `audio.${ext}`);
    formData.append('model', 'whisper-1');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let whisperRes: Response;
    try {
      whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!whisperRes.ok) {
      console.error('[transcribe] Whisper API error:', whisperRes.status, await whisperRes.text());
      res.json({ transcript: null });
      return;
    }

    const data = await whisperRes.json() as { text?: string };
    res.json({ transcript: typeof data.text === 'string' ? data.text.trim() : null });
  } catch (err) {
    console.error('[transcribe] error:', err);
    res.json({ transcript: null });
  }
});

app.post('/api/escalation-insight', async (req, res) => {
  try {
    const body = req.body as EscalationInsightRequestBody;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[escalation-insight] no ANTHROPIC_API_KEY set — using template fallback, not Claude');
      await new Promise(resolve => setTimeout(resolve, 400));
      res.json({ insight: fallbackEscalationInsight(body) });
      return;
    }

    console.log('[escalation-insight] calling Claude (claude-sonnet-5) for escalation insight...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 256,
      system: buildEscalationInsightPrompt(body),
      tools: [ESCALATION_INSIGHT_TOOL],
      tool_choice: { type: 'tool', name: 'escalation_insight' },
      messages: [{ role: 'user', content: "Explain today's safety pause." }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'escalation_insight'
    );

    if (!toolUse) {
      console.error('[escalation-insight] no tool_use block in response, content:', JSON.stringify(response.content));
      res.json({ insight: fallbackEscalationInsight(body) });
      return;
    }

    const input = toolUse.input as { insight?: unknown };
    if (typeof input.insight !== 'string' || input.insight.trim().length === 0) {
      console.error('[escalation-insight] unexpected tool input shape:', JSON.stringify(toolUse.input));
      res.json({ insight: fallbackEscalationInsight(body) });
      return;
    }

    res.json({ insight: input.insight.trim() });
  } catch (err) {
    console.error('escalation-insight error:', err);
    res.status(500).json({ error: 'Failed to reach the AI service.' });
  }
});

// Deletes the requesting user's own account and, via the ON DELETE CASCADE foreign keys already
// on every user-owned table (supabase/schema.sql), everything they've ever logged — check-ins,
// reports, rituals, habits, everything. The access token in the Authorization header is verified
// against Supabase first, so this can only ever delete the token's own account, never an
// arbitrary id passed in the request body.
app.post('/api/delete-account', async (req, res) => {
  if (!supabaseAdmin) {
    console.error('[delete-account] SUPABASE_SERVICE_ROLE_KEY not set — cannot delete accounts');
    res.status(500).json({ error: 'Account deletion is not configured on this server.' });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing access token.' });
    return;
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      res.status(401).json({ error: 'Invalid or expired session.' });
      return;
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) {
      console.error('[delete-account] deleteUser failed:', deleteError);
      res.status(500).json({ error: 'Failed to delete account.' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('delete-account error:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// Local dev / self-hosted (non-Vercel) bootstrapping only — Vercel imports `app` via
// api/index.ts and invokes it per-request, it never runs this function.
async function startServer() {
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

if (!process.env.VERCEL) {
  startServer();
}

export default app;
