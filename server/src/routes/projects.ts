import { Router, type Request, type Response } from 'express';
import { createProjectsService } from '../services/projects.js';
import type { Database } from '@cco/db';

export function projectsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createProjectsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(req.params.teamId);
    res.json({ data });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const project = service.getById(req.params.teamId, req.params.id);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ data: project });
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, description, repoUrl, repoPath, baseBranch } = req.body;
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }
    const project = service.create(req.params.teamId, { name, description, repoUrl, repoPath, baseBranch });
    res.status(201).json({ data: project });
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const updated = service.update(req.params.teamId, req.params.id, req.body);
    if (!updated) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ data: updated });
  });

  return router;
}
