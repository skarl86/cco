import { Router, type Request, type Response } from 'express';
import { createDocumentsService } from '../services/documents.js';
import { notFound, badRequest } from '../errors.js';
import type { Database } from '@cco/db';
import { param } from '../middleware/params.js';
import { emitEvent } from '../realtime/live-events.js';

export function documentsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createDocumentsService(database);

  router.get('/', (req: Request, res: Response) => {
    const data = service.list(param(req, 'teamId'), param(req, 'taskId'));
    res.json({ data });
  });

  router.get('/latest', (req: Request, res: Response) => {
    const doc = service.getLatest(param(req, 'teamId'), param(req, 'taskId'));
    if (!doc) throw notFound('No documents found for this task');
    res.json({ data: doc });
  });

  router.get('/:version', (req: Request, res: Response) => {
    const version = Number(param(req, 'version'));
    if (!Number.isFinite(version) || version < 1) {
      throw badRequest('version must be a positive integer');
    }
    const doc = service.getByVersion(
      param(req, 'teamId'),
      param(req, 'taskId'),
      version,
    );
    if (!doc) throw notFound('Document version not found');
    res.json({ data: doc });
  });

  router.post('/', (req: Request, res: Response) => {
    const { content, title, authorType, authorAgentId } = req.body;
    if (!content || typeof content !== 'string') {
      throw badRequest('content is required');
    }
    const teamId = param(req, 'teamId');
    const taskId = param(req, 'taskId');
    const doc = service.create(teamId, {
      taskId,
      title,
      content,
      authorType,
      authorAgentId,
    });
    emitEvent('document.created', teamId, { document: doc });
    res.status(201).json({ data: doc });
  });

  router.post('/:version/restore', (req: Request, res: Response) => {
    const version = Number(param(req, 'version'));
    if (!Number.isFinite(version) || version < 1) {
      throw badRequest('version must be a positive integer');
    }
    const teamId = param(req, 'teamId');
    const taskId = param(req, 'taskId');
    const doc = service.restore(teamId, taskId, version);
    if (!doc) throw notFound('Document version not found');
    emitEvent('document.restored', teamId, { document: doc });
    res.status(201).json({ data: doc });
  });

  return router;
}
