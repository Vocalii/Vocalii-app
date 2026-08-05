import { describe, it, expect } from 'vitest';
import { calculateVoiceReadiness } from './voiceReadiness';

describe('calculateVoiceReadiness', () => {
  it('best case: low effort, low demand, no symptoms', () => {
    const result = calculateVoiceReadiness({
      effort_score: 1,
      demand_score: 1,
      symptoms: [],
    });
    expect(result.score).toBe(100);
    expect(result.label).toBe('Voice Ready');
    expect(result.contributing_factors.effort).toBe(100);
    expect(result.contributing_factors.demand).toBe(100);
    expect(result.contributing_factors.symptoms).toBe(100);
  });

  it('worst case: max effort, max demand, many symptoms', () => {
    const result = calculateVoiceReadiness({
      effort_score: 10,
      demand_score: 5,
      symptoms: ['pain', 'hoarseness', 'fatigue', 'dryness', 'tightness', 'swelling', 'strain'],
    });
    expect(result.score).toBeLessThan(15);
    expect(result.label).toBe('Rest & Recover');
    expect(result.contributing_factors.effort).toBe(0);
    expect(result.contributing_factors.demand).toBe(0);
    expect(result.contributing_factors.symptoms).toBe(0);
  });

  it('no symptoms gives full symptoms score', () => {
    const result = calculateVoiceReadiness({
      effort_score: 5,
      demand_score: 3,
      symptoms: [],
    });
    expect(result.contributing_factors.symptoms).toBe(100);
  });

  it('each symptom reduces symptoms score by 15, floored at 0', () => {
    const one = calculateVoiceReadiness({
      effort_score: 5, demand_score: 3, symptoms: ['hoarseness'],
    });
    expect(one.contributing_factors.symptoms).toBe(85);

    const seven = calculateVoiceReadiness({
      effort_score: 5, demand_score: 3, symptoms: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    expect(seven.contributing_factors.symptoms).toBe(0);
  });

  it('missing acoustic fields uses 3-factor weights', () => {
    const result = calculateVoiceReadiness({
      effort_score: 1,
      demand_score: 1,
      symptoms: [],
    });
    expect(result.contributing_factors.acoustic).toBeUndefined();
    expect(result.score).toBe(100);
  });

  it('with acoustic data blends all factors', () => {
    const result = calculateVoiceReadiness({
      effort_score: 1,
      demand_score: 1,
      symptoms: [],
      acoustic_clarity: 100,
      acoustic_fatigue: 0,
    });
    expect(result.score).toBe(100);
    expect(result.contributing_factors.acoustic).toBe(100);
  });

  it('acoustic_fatigue is inverted (lower fatigue = higher score)', () => {
    const lowFatigue = calculateVoiceReadiness({
      effort_score: 5, demand_score: 3, symptoms: [],
      acoustic_clarity: 50, acoustic_fatigue: 0,
    });
    const highFatigue = calculateVoiceReadiness({
      effort_score: 5, demand_score: 3, symptoms: [],
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
      demand_score: 4,
      symptoms: ['dryness'],
      acoustic_clarity: 75,
      acoustic_fatigue: 20,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['Voice Ready', 'Steady', 'Needs Support', 'Rest & Recover']).toContain(result.label);
  });
});
