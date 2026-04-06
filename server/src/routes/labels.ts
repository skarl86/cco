import { Router, type Request, type Response } from 'express';
import { createLabelsService } from '../services/labels.js';
import { notFound, badRequest } from '../errors.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';

export function labelsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createLabelsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(param(req, 'teamId'));
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, color } = req.body;
    if (!name || typeof name !== 'string') {
      throw badRequest('name is required');
    }
    const label = service.create(param(req, 'teamId'), { name, color });
    res.status(201).json({ data: label });
  });

  router.delete('/:labelId', (req: Request, res: Response) => {
    service.delete(param(req, 'labelId'));
    res.status(204).end();
  });

  return router;
}

export function taskLabelsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createLabelsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.getTaskLabels(param(req, 'teamId'), param(req, 'taskId'));
    res.json({ data });
  });

  router.put('/', (req: Request, res: Response) => {
    const { labelIds } = req.body;
    if (!Array.isArray(labelIds)) {
      throw badRequest('labelIds must be an array');
    }
    service.syncTaskLabels(param(req, 'teamId'), param(req, 'taskId'), labelIds);
    const data = service.getTaskLabels(param(req, 'teamId'), param(req, 'taskId'));
    res.json({ data });
  });

  return router;
}
