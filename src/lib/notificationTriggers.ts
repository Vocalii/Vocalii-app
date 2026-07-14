export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  trigger_type: 'post_checkin' | 'missed_habit' | 'pre_event' | 'post_event' | 'celebration';
  read: boolean;
  created_at: Date;
};

// Copy lives here as flat, placeholder-driven templates ({{token}}) so it can move
// to a Sanity document (one field per tier) without touching the trigger logic below.
const COPY = {
  postCheckIn: {
    strain: {
      title: 'Check-in logged',
      body: "It sounds like your voice worked hard today. Your ritual has been adjusted — open it when you're ready.",
    },
    light: {
      title: 'Check-in logged',
      body: 'Great day for your voice. Your ritual is ready whenever you are.',
    },
    neutral: {
      title: 'Check-in logged',
      body: 'Your check-in is in and your ritual has been updated — ready whenever you are.',
    },
  },
  missedHabit: {
    short: {
      title: 'Pick it back up?',
      body: 'Your {{habit_name}} ritual is still here whenever you want to return to it. Small steps count.',
    },
    long: {
      title: "Whenever you're ready",
      body: 'No pressure — your {{habit_name}} ritual is ready whenever you want to ease back in.',
    },
  },
  preEvent: {
    today: {
      title: 'Happening today',
      body: 'Your {{event_name}} is today. A quick warm-up ritual could help your voice feel ready.',
    },
    upcoming: {
      title: 'Coming up soon',
      body: 'Your {{event_name}} is coming up soon. A quick warm-up ritual could help your voice feel ready.',
    },
  },
  postEvent: {
    brief: {
      title: 'Nice work',
      body: 'You just wrapped {{event_name}}. A short reset could help your voice recover quickly.',
    },
    moderate: {
      title: 'Time to recover',
      body: 'That was a solid stretch at {{event_name}}. Your recovery ritual is ready to help you unwind.',
    },
    extended: {
      title: 'Give your voice rest',
      body: 'You gave your voice a big day at {{event_name}}. A restorative ritual is ready whenever you want to ease the strain.',
    },
  },
  celebration: {
    early: {
      title: 'Keep going',
      body: "You're building momentum with {{habit_name}}. Every rep brings you closer to sounding {{traits}}.",
    },
    milestone: {
      title: 'Great momentum',
      body: "You've kept up {{habit_name}} this week — every rep moves you toward sounding {{traits}}.",
    },
    perfectWeek: {
      title: 'Perfect week!',
      body: "You showed up for {{habit_name}} every day this week — that's exactly the consistency behind sounding {{traits}}.",
    },
  },
} as const;

const HIGH_EFFORT_THRESHOLD = 7;
const LOW_EFFORT_THRESHOLD = 3;
const MISSED_HABIT_LONG_THRESHOLD = 5;
const PRE_EVENT_TODAY_MAX_HOURS = 24;
const POST_EVENT_BRIEF_MAX_HOURS = 1;
const POST_EVENT_EXTENDED_MIN_HOURS = 4;
const CELEBRATION_MILESTONE_THRESHOLD = 3;
const CELEBRATION_PERFECT_WEEK_THRESHOLD = 7;

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function joinTraits(traits: string[]): string {
  const lower = traits.map(t => t.toLowerCase());
  if (lower.length === 0) return 'the voice you want';
  if (lower.length === 1) return lower[0];
  if (lower.length === 2) return `${lower[0]} and ${lower[1]}`;
  return `${lower.slice(0, -1).join(', ')}, and ${lower[lower.length - 1]}`;
}

function createNotification(
  user_id: string,
  trigger_type: Notification['trigger_type'],
  title: string,
  body: string,
): Notification {
  return {
    id: crypto.randomUUID(),
    user_id,
    title,
    body,
    trigger_type,
    read: false,
    created_at: new Date(),
  };
}

// Type 1 — fires once after daily check-in completes.
export function postCheckInTrigger(
  user_id: string,
  effort_score: number,
  symptoms: string[],
): Notification {
  const copy =
    effort_score >= HIGH_EFFORT_THRESHOLD || symptoms.length > 0
      ? COPY.postCheckIn.strain
      : effort_score <= LOW_EFFORT_THRESHOLD
        ? COPY.postCheckIn.light
        : COPY.postCheckIn.neutral;

  return createNotification(user_id, 'post_checkin', copy.title, copy.body);
}

export function missedHabitTrigger(
  user_id: string,
  days_missed: number,
  habit_name: string,
): Notification {
  const copy = days_missed >= MISSED_HABIT_LONG_THRESHOLD ? COPY.missedHabit.long : COPY.missedHabit.short;
  return createNotification(user_id, 'missed_habit', copy.title, fill(copy.body, { habit_name }));
}

export function preEventTrigger(
  user_id: string,
  event_name: string,
  event_time: Date,
): Notification {
  const hoursUntil = (event_time.getTime() - Date.now()) / (1000 * 60 * 60);
  const copy = hoursUntil <= PRE_EVENT_TODAY_MAX_HOURS ? COPY.preEvent.today : COPY.preEvent.upcoming;
  return createNotification(user_id, 'pre_event', copy.title, fill(copy.body, { event_name }));
}

export function postEventTrigger(
  user_id: string,
  event_name: string,
  duration_hours: number,
): Notification {
  const copy =
    duration_hours < POST_EVENT_BRIEF_MAX_HOURS
      ? COPY.postEvent.brief
      : duration_hours >= POST_EVENT_EXTENDED_MIN_HOURS
        ? COPY.postEvent.extended
        : COPY.postEvent.moderate;
  return createNotification(user_id, 'post_event', copy.title, fill(copy.body, { event_name }));
}

export function habitCelebrationTrigger(
  user_id: string,
  completions_this_week: number,
  habit_name: string,
  desired_voice_image: string[],
): Notification {
  const traits = joinTraits(desired_voice_image);
  const copy =
    completions_this_week >= CELEBRATION_PERFECT_WEEK_THRESHOLD
      ? COPY.celebration.perfectWeek
      : completions_this_week >= CELEBRATION_MILESTONE_THRESHOLD
        ? COPY.celebration.milestone
        : COPY.celebration.early;

  return createNotification(user_id, 'celebration', copy.title, fill(copy.body, { habit_name, traits }));
}
