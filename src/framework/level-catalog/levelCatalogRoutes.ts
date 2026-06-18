import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { LevelCatalogController } from './LevelCatalogController.js';

export function createLevelCatalogRouter(
  controller: LevelCatalogController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();

  router.get('/levels', (req, res, next) => controller.listLevels(req, res, next));
  router.get('/levels/:levelId', (req, res, next) => controller.getLevel(req, res, next));

  router.post('/levels', authMiddleware, (req, res, next) => controller.createLevel(req, res, next));
  router.put('/levels/:levelId/definition', authMiddleware, (req, res, next) => controller.updateDefinition(req, res, next));
  router.post('/levels/:levelId/publish', authMiddleware, (req, res, next) => controller.publishLevel(req, res, next));
  router.post('/levels/:levelId/archive', authMiddleware, (req, res, next) => controller.archiveLevel(req, res, next));

  return router;
}
