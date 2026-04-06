import { Router, type Request, type Response } from 'express';
import { createCommentsService } from '../services/comments.js';
import type { Database } from '@cco/db';

export function commentsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createCommentsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.listByTask(req.params.teamId, req.params.taskId);
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { body, authorType, authorAgentId } = req.body;
    if (!body || typeof body !== 'string') {
      res.status(400).json({ error: 'body is required' });
      return;
    }
    const comment = service.create({
      teamId: req.params.teamId,
      taskId: req.params.taskId,
      authorType: authorType ?? 'user',
      authorAgentId,
      body,
    });
    res.status(201).json({ data: comment });
  });

  return router;
}
