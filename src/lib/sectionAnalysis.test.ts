import { describe, it, expect } from 'vitest';
import { alignWords, wordLevelSimilarity } from './sectionAnalysis';

describe('alignWords', () => {
  it('exact match: 100%, nothing to retry', () => {
    const r = alignWords('Red leather, yellow leather.', 'red leather yellow leather');
    expect(r.matchPct).toBe(100);
    expect(r.correct).toBe(4);
    expect([r.substituted, r.omitted, r.added]).toEqual([0, 0, 0]);
    expect(r.wordsToRetry).toEqual([]);
    expect(r.referenceWordCount).toBe(4);
  });

  it('one substitution', () => {
    const r = alignWords('she sells see shells', 'She sells sea shells');
    expect([r.correct, r.substituted, r.omitted, r.added]).toEqual([3, 1, 0, 0]);
    expect(r.matchPct).toBe(75);
    expect(r.wordsToRetry).toEqual(['sea']);
    expect(r.ops[2]).toEqual({ type: 'substituted', target: 'sea', heard: 'see' });
  });

  it('one omission', () => {
    const r = alignWords('she sells shells', 'she sells sea shells');
    expect([r.correct, r.substituted, r.omitted, r.added]).toEqual([3, 0, 1, 0]);
    expect(r.matchPct).toBe(75);
    expect(r.wordsToRetry).toEqual(['sea']);
  });

  it('one addition', () => {
    const r = alignWords('she sells sea big shells', 'she sells sea shells');
    expect([r.correct, r.substituted, r.omitted, r.added]).toEqual([4, 0, 0, 1]);
    expect(r.matchPct).toBe(75);
    expect(r.wordsToRetry).toEqual([]);
  });

  it('keeps the prompt casing and ignores punctuation and case when comparing', () => {
    const r = alignWords('the early morning fog', '"The early morning fog settled."');
    expect(r.ops[0]).toEqual({ type: 'correct', target: 'The', heard: 'the' });
    expect(r.omitted).toBe(1);
    expect(r.wordsToRetry).toEqual(['settled']);
  });

  it('a repeated target word is retried once but counted each time', () => {
    const r = alignWords('red red', 'red leather red leather');
    expect(r.omitted).toBe(2);
    expect(r.wordsToRetry).toEqual(['leather']);
  });

  it('empty transcript: everything omitted, 0%', () => {
    const r = alignWords('', 'one two three');
    expect(r.matchPct).toBe(0);
    expect(r.omitted).toBe(3);
    expect(r.wordsToRetry).toEqual(['one', 'two', 'three']);
  });

  it('empty prompt: 0% and no ops on the target side', () => {
    const r = alignWords('hello', '');
    expect(r.matchPct).toBe(0);
    expect(r.referenceWordCount).toBe(0);
  });

  it('counts add up: correct + substituted + omitted = target words', () => {
    const r = alignWords('a b x d e f', 'a b c d g');
    expect(r.correct + r.substituted + r.omitted).toBe(r.referenceWordCount);
  });
});

describe('wordLevelSimilarity', () => {
  it('equals the previous single-number result', () => {
    // 1 - editDistance / referenceWordCount, same as before the breakdown was added
    expect(wordLevelSimilarity('she sells see shells', 'she sells sea shells')).toBe(75);
    expect(wordLevelSimilarity('', 'one two')).toBe(0);
    expect(wordLevelSimilarity('one two', 'one two')).toBe(100);
    expect(wordLevelSimilarity('one two three four five', 'one two')).toBe(0);
  });
});
