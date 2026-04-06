import { Router, type Request, type Response } from 'express';
import { createAgentInstructionsService } from '../services/agent-instructions.js';
import { badRequest, notFound } from '../errors.js';
import { param } from '../middleware/params.js';
import type { Database } from '@cco/db';

export function agentDetailsRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createAgentInstructionsService(database);

  router.get('/instructions', (req: Request, res: Response) => {
    const agentId = param(req, 'agentId');
    const instructions = service.get(agentId);
    res.json({ data: { instructions } });
  });

  router.patch('/instructions', (req: Request, res: Response) => {
    const { instructions } = req.body as { instructions?: string };
    if (typeof instructions !== 'string') {
      throw badRequest('instructions must be a string');
    }
    const agentId = param(req, 'agentId');
    const result = service.update(agentId, instructions);
    if (result === null) throw notFound('Agent not found');
    res.json({ data: { instructions: result } });
  });

  router.get('/permissions', (req: Request, res: Response) => {
    const agentId = param(req, 'agentId');
    const permissions = service.getPermissions(agentId);
    res.json({ data: { permissions } });
  });

  router.patch('/permissions', (req: Request, res: Response) => {
    const permissions = req.body as Record<string, unknown>;
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
      throw badRequest('Body must be an object of permission flags');
    }
    const agentId = param(req, 'agentId');
    const result = service.updatePermissions(
      agentId,
      permissions as Record<string, boolean>,
    );
    if (result === null) throw notFound('Agent not found');
    res.json({ data: { permissions: result } });
  });

  return router;
}
