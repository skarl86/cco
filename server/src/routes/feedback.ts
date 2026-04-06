import { Router, type Request, type Response } from 'express';
import { createFeedbackService } from '../services/feedback.js';
import { badRequest } from '../errors.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';
import { emitEvent } from '../realtime/live-events.js';

export function feedbackRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createFeedbackService(database);

  router.get('/', (req: Request, res: Response) => {
    const { targetType, targetId, vote, limit } = req.query;
    const data = service.list(param(req, 'teamId'), {
      targetType: targetType as string | undefined,
      targetId: targetId as string | undefined,
      vote: vote as string | undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { targetType, targetId, vote, reason, actorType, actorId, payload } =
      req.body;
    if (!targetType || typeof targetType !== 'string') {
      throw badRequest('targetType is required');
    }
    if (!targetId || typeof targetId !== 'string') {
      throw badRequest('targetId is required');
    }
    if (!vote || typeof vote !== 'string') {
      throw badRequest('vote is required');
    }
    const teamId = param(req, 'teamId');
    const entry = service.create(teamId, {
      targetType,
      targetId,
      vote,
      reason,
      actorType,
      actorId,
      payload,
    });
    emitEvent('feedback.created', teamId, { feedback: entry });
    res.status(201).json({ data: entry });
  });

  router.get('/summary', (req: Request, res: Response) => {
    const { targetType, targetId } = req.query;
    if (!targetType || typeof targetType !== 'string') {
      throw badRequest('targetType query param is required');
    }
    if (!targetId || typeof targetId !== 'string') {
      throw badRequest('targetId query param is required');
    }
    const data = service.getSummary(
      param(req, 'teamId'),
      targetType,
      targetId,
    );
    res.json({ data });
  });

  return router;
}

export function taskFeedbackRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createFeedbackService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.getByTarget(
      param(req, 'teamId'),
      'task',
      param(req, 'taskId'),
    );
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { vote, reason, actorType, actorId, payload } = req.body;
    if (!vote || typeof vote !== 'string') {
      throw badRequest('vote is required');
    }
    const teamId = param(req, 'teamId');
    const taskId = param(req, 'taskId');
    const entry = service.create(teamId, {
      targetType: 'task',
      targetId: taskId,
      vote,
      reason,
      actorType,
      actorId,
      payload,
    });
    emitEvent('feedback.created', teamId, { feedback: entry });
    res.status(201).json({ data: entry });
  });

  return router;
}
