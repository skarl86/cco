import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Database } from '@cco/db';
import type { StorageProvider } from '../storage/index.js';
import { badRequest, notFound } from '../errors.js';
import { param } from '../middleware/params.js';

export function assetsRouter(database: Database, storage: StorageProvider): Router {
  const router = Router({ mergeParams: true });

  router.post('/', async (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const { name, contentBase64 } = req.body as { name?: string; contentBase64?: string };

    if (!name || typeof name !== 'string') {
      throw badRequest('Missing or invalid "name"');
    }
    if (!contentBase64 || typeof contentBase64 !== 'string') {
      throw badRequest('Missing or invalid "contentBase64"');
    }

    const assetId = randomUUID();
    const key = `${teamId}/${assetId}/${name}`;
    const data = Buffer.from(contentBase64, 'base64');

    const MAX_ASSET_BYTES = 10 * 1024 * 1024; // 10MB
    if (data.length > MAX_ASSET_BYTES) {
      throw badRequest(`Asset exceeds maximum size (${MAX_ASSET_BYTES} bytes)`);
    }

    await storage.write(key, data);

    res.status(201).json({
      data: { id: assetId, name, teamId, key },
    });
  });

  router.get('/:assetId', async (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const assetId = param(req, 'assetId');
    const prefix = `${teamId}/${assetId}/`;

    // Since we store as teamId/assetId/name, we need to find the file.
    // For simplicity, check if the directory-like prefix exists by testing common patterns.
    // A production system would use a metadata DB. Here we rely on the storage provider.
    const keyExists = await storage.exists(prefix);
    if (keyExists) {
      const content = await storage.read(prefix);
      res.json({
        data: { id: assetId, contentBase64: content.toString('base64') },
      });
      return;
    }

    // Try to find by listing — but our simple provider doesn't support listing.
    // Fallback: the caller must know the full key. Accept ?name query param.
    const name = req.query['name'];
    if (!name || typeof name !== 'string') {
      throw notFound('Asset not found. Provide ?name= query parameter.');
    }

    const key = `${teamId}/${assetId}/${name}`;
    const exists = await storage.exists(key);
    if (!exists) {
      throw notFound('Asset not found');
    }

    const content = await storage.read(key);
    res.json({
      data: { id: assetId, name, contentBase64: content.toString('base64') },
    });
  });

  router.delete('/:assetId', async (req: Request, res: Response) => {
    const teamId = param(req, 'teamId');
    const assetId = param(req, 'assetId');
    const name = req.query['name'];

    if (!name || typeof name !== 'string') {
      throw badRequest('Provide ?name= query parameter to identify the asset file');
    }

    const key = `${teamId}/${assetId}/${name}`;
    await storage.delete(key);
    res.status(204).end();
  });

  return router;
}
