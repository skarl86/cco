import { describe, it, expect } from 'vitest';
import { parseCron, validateCron, nextCronTick, cronMatches } from './cron.js';

describe('parseCron', () => {
  it('parses a simple expression', () => {
    const parsed = parseCron('0 12 * * 1');
    expect(parsed).not.toBeNull();
    expect(parsed!.minutes).toEqual([0]);
    expect(parsed!.hours).toEqual([12]);
    expect(parsed!.daysOfWeek).toEqual([1]);
  });

  it('parses wildcards', () => {
    const parsed = parseCron('* * * * *');
    expect(parsed).not.toBeNull();
    expect(parsed!.minutes.length).toBe(60);
    expect(parsed!.hours.length).toBe(24);
  });

  it('parses ranges', () => {
    const parsed = parseCron('1-5 * * * *');
    expect(parsed).not.toBeNull();
    expect(parsed!.minutes).toEqual([1, 2, 3, 4, 5]);
  });

  it('parses steps', () => {
    const parsed = parseCron('*/15 * * * *');
    expect(parsed).not.toBeNull();
    expect(parsed!.minutes).toEqual([0, 15, 30, 45]);
  });

  it('parses lists', () => {
    const parsed = parseCron('0,30 9,17 * * *');
    expect(parsed).not.toBeNull();
    expect(parsed!.minutes).toEqual([0, 30]);
    expect(parsed!.hours).toEqual([9, 17]);
  });

  it('returns null for invalid expression', () => {
    expect(parseCron('invalid')).toBeNull();
    expect(parseCron('1 2 3')).toBeNull();
    expect(parseCron('')).toBeNull();
  });
});

describe('validateCron', () => {
  it('returns null for valid expression', () => {
    expect(validateCron('0 12 * * 1')).toBeNull();
  });

  it('returns error for invalid expression', () => {
    expect(validateCron('invalid')).toContain('Invalid cron');
  });
});

describe('cronMatches', () => {
  it('matches a date against parsed cron', () => {
    const parsed = parseCron('30 14 * * *')!;
    const matching = new Date('2026-04-06T14:30:00');
    const notMatching = new Date('2026-04-06T14:31:00');
    expect(cronMatches(parsed, matching)).toBe(true);
    expect(cronMatches(parsed, notMatching)).toBe(false);
  });
});

describe('nextCronTick', () => {
  it('finds the next matching time', () => {
    const parsed = parseCron('0 12 * * *')!;
    const after = new Date('2026-04-06T11:00:00');
    const next = nextCronTick(parsed, after);
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(12);
    expect(next!.getMinutes()).toBe(0);
  });
});
