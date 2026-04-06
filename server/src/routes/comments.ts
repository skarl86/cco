import { Router, type Request, type Response } from 'express';
import { createCommentsService } from '../services/comments.js';
import { badRequest } from '../errors.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function commentsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createCommentsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.listByTask(param(req, 'teamId'), param(req, 'taskId'));
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { body, authorType, authorAgentId } = req.body;
    if (!body || typeof body !== 'string') {
      throw badRequest('body is required');
    }
    const comment = service.create({
      teamId: param(req, 'teamId') as string,
      taskId: param(req, 'taskId') as string,
      authorType: authorType ?? 'user',
      authorAgentId,
      body,
    });
    res.status(201).json({ data: comment });
  });

  return router;
}
