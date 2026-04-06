import { Router, type Request, type Response } from 'express';
import { CreateTaskSchema } from '@cco/shared';
import { createTasksService } from '../services/tasks.js';
import type { Database } from '@cco/db';

export function tasksRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createTasksService(database);

  router.get('/', (req: Request, res: Response) => {
    const { status, assigneeAgentId } = req.query;
    const data = service.list(req.params.teamId, {
      status: status as string | undefined,
      assigneeAgentId: assigneeAgentId as string | undefined,
    });
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const task = service.getById(req.params.teamId, req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ data: task });
  });

  router.get('/:id/children', (req: Request, res: Response) => {
    const data = service.listChildren(req.params.teamId, req.params.id);
    res.json({ data });
  });

  router.post('/', (req: Request, res: Response) => {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }
    const task = service.create(req.params.teamId, parsed.data);
    res.status(201).json({ data: task });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    try {
      const updated = service.update(req.params.teamId, req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json({ data: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      res.status(400).json({ error: message });
    }
  });

  return router;
}
