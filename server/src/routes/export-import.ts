import { Router, type Request, type Response } from 'express';
import { createExportImportService } from '../services/export-import.js';
import { notFound, badRequest } from '../errors.js';
import { param } from '../middleware/params.js';
import { createTeamsService } from '../services/teams.js';
import type { Database } from '@cco/db';
import type { TeamExport } from '../services/export-import.js';

export function exportImportRouter(database: Database): Router {
  const router = Router({ mergeParams: true });
  const service = createExportImportService(database);
  const teamsService = createTeamsService(database);

  router.post('/export', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const team = teamsService.getById(teamId);
    if (!team) throw notFound('Team not found');

    const data = service.exportTeam(teamId);
    res.json({ data });
  });

  router.post('/import', (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const team = teamsService.getById(teamId);
    if (!team) throw notFound('Team not found');

    const body = req.body as TeamExport | undefined;
    if (!body || body.version !== '1') {
      throw badRequest('Invalid import data: expected version "1"');
    }

    const result = service.importTeam(body, teamId);
    res.status(201).json({ data: result });
  });

  return router;
}
