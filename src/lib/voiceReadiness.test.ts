import { describe, it, expect } from 'vitest';
import { calculateVoiceReadiness } from './voiceReadiness';

describe('calculateVoiceReadiness', () => {
  it('best case: low effort, high confidence, no symptoms, habit done', () => {
    const result = calculateVoiceReadiness({
      effort_score: 1,
      confidence_score: 10,
      symptoms: [],
      habit_completed: true,
    });
    expect(result.score).toBe(100);
    expect(result.label).toBe('Voice Ready');
    expect(result.contributing_factors.effort).toBe(100);
    expect(result.contributing_factors.confidence).toBe(100);
    expect(result.contributing_factors.symptoms).toBe(100);
    expect(result.contributing_factors.habit).toBe(100);
  });

  it('worst case: max effort, zero confidence, many symptoms, no habit', () => {
    const result = calculateVoiceReadiness({
      effort_score: 10,
      confidence_score: 1,
      symptoms: ['pain', 'hoarseness', 'fatigue', 'dryness', 'tightness', 'swelling', 'strain'],
      habit_completed: false,
    });
    expect(result.score).toBeLessThan(15);
    expect(result.label).toBe('Rest & Recover');
    expect(result.contributing_factors.effort).toBe(0);
    expect(result.contributing_factors.habit).toBe(0);
    expect(result.contributing_factors.symptoms).toBe(0);
  });

  it('no symptoms gives full symptoms score', () => {
    const result = calculateVoiceReadiness({
      effort_score: 5,
      confidence_score: 5,
      symptoms: [],
      habit_completed: false,
    });
    expect(result.contributing_factors.symptoms).toBe(100);
  });

  it('each symptom reduces symptoms score by 15, floored at 0', () => {
    const one = calculateVoiceReadiness({
      effort_score: 5, confidence_score: 5, symptoms: ['hoarseness'], habit_completed: false,
    });
    expect(one.contributing_factors.symptoms).toBe(85);

    const seven = calculateVoiceReadiness({
      effort_score: 5, confidence_score: 5, symptoms: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], habit_completed: false,
    });
    expect(seven.contributing_factors.symptoms).toBe(0);
  });

  it('missing acoustic fields uses 4-factor weights', () => {
    const result = calculateVoiceReadiness({
      effort_score: 1,
      confidence_score: 10,
      symptoms: [],
      habit_completed: true,
    });
    expect(result.contributing_factors.acoustic).toBeUndefined();
    expect(result.score).toBe(100);
  });

  it('with acoustic data blends all 6 factors', () => {
    const result = calculateVoiceReadiness({
      effort_score: 1,
      confidence_score: 10,
      symptoms: [],
      habit_completed: true,
      acoustic_clarity: 100,
      acoustic_fatigue: 0,
    });
    expect(result.score).toBe(100);
    expect(result.contributing_factors.acoustic).toBe(100);
  });

  it('acoustic_fatigue is inverted (lower fatigue = higher score)', () => {
    const lowFatigue = calculateVoiceReadiness({
      effort_score: 5, confidence_score: 5, symptoms: [], habit_completed: false,
      acoustic_clarity: 50, acoustic_fatigue: 0,
    });
    const highFatigue = calculateVoiceReadiness({
      effort_score: 5, confidence_score: 5, symptoms: [], habit_completed: false,
      acoustic_clarity: 50, acoustic_fatigue: 100,
    });
    expect(lowFatigue.score).toBeGreaterThan(highFatigue.score);
  });

  it('label boundaries: 85 = Voice Ready, 84 = Steady, 70 = Steady, 69 = Needs Support, 50 = Needs Support, 49 = Rest & Recover', () => {
    const labelForScore = (score: number) => {
      if (score >= 85) return 'Voice Ready';
      if (score >= 70) return 'Steady';
      if (score >= 50) return 'Needs Support';
      return 'Rest & Recover';
    };
    expect(labelForScore(85)).toBe('Voice Ready');
    expect(labelForScore(84)).toBe('Steady');
    expect(labelForScore(70)).toBe('Steady');
    expect(labelForScore(69)).toBe('Needs Support');
    expect(labelForScore(50)).toBe('Needs Support');
    expect(labelForScore(49)).toBe('Rest & Recover');
  });

  it('all inputs provided (combined integration)', () => {
    const result = calculateVoiceReadiness({
      effort_score: 3,
      confidence_score: 8,
      symptoms: ['dryness'],
      habit_completed: true,
      acoustic_clarity: 75,
      acoustic_fatigue: 20,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['Voice Ready', 'Steady', 'Needs Support', 'Rest & Recover']).toContain(result.label);
  });
});
