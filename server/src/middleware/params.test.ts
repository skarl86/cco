import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { param } from './params.js';

function fakeRequest(params: Record<string, string | string[]>): Request {
  return { params } as unknown as Request;
}

describe('param helper', () => {
  it('returns the string when params[name] is a string', () => {
    const req = fakeRequest({ id: 'abc-123' });

    expect(param(req, 'id')).toBe('abc-123');
  });

  it('returns first element when params[name] is an array', () => {
    const req = fakeRequest({ id: ['first', 'second'] });

    expect(param(req, 'id')).toBe('first');
  });
});
