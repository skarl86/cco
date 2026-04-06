import { describe, it, expect } from 'vitest';
import { generateId } from './id.js';

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('returns unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('returns ids with default length of 21', () => {
    const id = generateId();
    expect(id.length).toBe(21);
  });

  it('supports custom prefix', () => {
    const id = generateId('agent');
    expect(id.startsWith('agent_')).toBe(true);
  });
});
