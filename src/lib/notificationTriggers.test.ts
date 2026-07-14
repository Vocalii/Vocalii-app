import { describe, it, expect } from 'vitest';
import {
  postCheckInTrigger,
  missedHabitTrigger,
  preEventTrigger,
  postEventTrigger,
  habitCelebrationTrigger,
  type Notification,
} from './notificationTriggers';

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function expectWellFormed(n: Notification, trigger_type: Notification['trigger_type'], user_id: string) {
  expect(n.user_id).toBe(user_id);
  expect(n.trigger_type).toBe(trigger_type);
  expect(n.read).toBe(false);
  expect(n.created_at).toBeInstanceOf(Date);
  expect(n.id).toBeTruthy();
  expect(wordCount(n.title)).toBeLessThan(5);
  expect(wordCount(n.body)).toBeLessThanOrEqual(30);
}

describe('postCheckInTrigger', () => {
  it('high effort with symptoms acknowledges strain, no repeated scores/symptoms', () => {
    const n = postCheckInTrigger('u1', 8, ['dryness', 'fatigue']);
    expectWellFormed(n, 'post_checkin', 'u1');
    expect(n.title).toBe('Check-in logged');
    expect(n.body).toMatch(/adjusted/i);
    expect(n.body).not.toMatch(/dryness|fatigue|8/i);
  });

  it('high effort alone (no symptoms) is treated as strain', () => {
    const n = postCheckInTrigger('u1', 9, []);
    expect(n.body).toMatch(/adjusted/i);
  });

  it('low effort, no symptoms gives a light positive message', () => {
    const n = postCheckInTrigger('u1', 2, []);
    expectWellFormed(n, 'post_checkin', 'u1');
    expect(n.title).toBe('Check-in logged');
    expect(n.body).toMatch(/great day/i);
  });

  it('mid-range effort, no symptoms falls back to the neutral message', () => {
    const n = postCheckInTrigger('u1', 5, []);
    expect(n.body).toMatch(/updated/i);
  });
});

describe('missedHabitTrigger', () => {
  it('2 days missed uses the gentle short-gap copy', () => {
    const n = missedHabitTrigger('u1', 2, 'Vocal Hum');
    expectWellFormed(n, 'missed_habit', 'u1');
    expect(n.title).toBe('Pick it back up?');
    expect(n.body).toContain('Vocal Hum');
    expect(n.body).not.toMatch(/\b2\b/);
  });

  it('5 days missed uses the warmer long-gap copy', () => {
    const n = missedHabitTrigger('u1', 5, 'Vocal Hum');
    expectWellFormed(n, 'missed_habit', 'u1');
    expect(n.title).toBe("Whenever you're ready");
    expect(n.body).toContain('Vocal Hum');
    expect(n.body).not.toMatch(/\b5\b/);
  });

  it('never uses shaming language regardless of gap length', () => {
    const short = missedHabitTrigger('u1', 2, 'Vocal Hum');
    const long = missedHabitTrigger('u1', 12, 'Vocal Hum');
    for (const n of [short, long]) {
      expect(n.body.toLowerCase()).not.toMatch(/missed|failed|forgot|behind|should have/);
    }
  });
});

describe('preEventTrigger', () => {
  it('references the event by name with a warm, forward-looking message', () => {
    const eventTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const n = preEventTrigger('u1', 'Client Presentation', eventTime);
    expectWellFormed(n, 'pre_event', 'u1');
    expect(n.body).toContain('Client Presentation');
    expect(n.body).toMatch(/warm-up/i);
  });
});

describe('postEventTrigger', () => {
  it('under 1 hour gets a brief, light-touch message', () => {
    const n = postEventTrigger('u1', 'Team Meeting', 0.5);
    expectWellFormed(n, 'post_event', 'u1');
    expect(n.title).toBe('Nice work');
    expect(n.body).toContain('Team Meeting');
  });

  it('4+ hours gets a stronger recovery-focused message', () => {
    const n = postEventTrigger('u1', 'Conference Talk', 5);
    expectWellFormed(n, 'post_event', 'u1');
    expect(n.title).toBe('Give your voice rest');
    expect(n.body).toContain('Conference Talk');
  });

  it('a mid-range duration (1-4 hours) gets the moderate message', () => {
    const n = postEventTrigger('u1', 'Workshop', 2);
    expect(n.title).toBe('Time to recover');
  });
});

describe('habitCelebrationTrigger', () => {
  it('3 completions is a milestone, framed around the desired voice traits', () => {
    const n = habitCelebrationTrigger('u1', 3, 'Vocal Hum', ['Confident']);
    expectWellFormed(n, 'celebration', 'u1');
    expect(n.title).toBe('Great momentum');
    expect(n.body).toContain('Vocal Hum');
    expect(n.body).toMatch(/confident/i);
  });

  it('7 completions is a perfect week, still framed around what is possible', () => {
    const n = habitCelebrationTrigger('u1', 7, 'Vocal Hum', ['Confident', 'Clear']);
    expectWellFormed(n, 'celebration', 'u1');
    expect(n.title).toBe('Perfect week!');
    expect(n.body).toContain('confident and clear');
    expect(n.body).not.toMatch(/\b7\b/);
  });

  it('fewer than 3 completions still encourages without any specific count', () => {
    const n = habitCelebrationTrigger('u1', 1, 'Vocal Hum', ['Warm']);
    expect(n.title).toBe('Keep going');
    expect(n.body).not.toMatch(/\b1\b/);
  });

  it('falls back gracefully when no desired voice traits are provided', () => {
    const n = habitCelebrationTrigger('u1', 3, 'Vocal Hum', []);
    expect(n.body).not.toContain('{{traits}}');
  });
});
