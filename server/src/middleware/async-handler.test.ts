import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from './async-handler.js';

function fakeReqRes() {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe('asyncHandler', () => {
  it('calls res normally when the async handler resolves', async () => {
    const { req, res, next } = fakeReqRes();

    const handler = asyncHandler(async (_req, innerRes) => {
      innerRes.status(200).json({ ok: true });
    });

    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with error when the async handler rejects', async () => {
    const { req, res, next } = fakeReqRes();
    const error = new Error('boom');

    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
