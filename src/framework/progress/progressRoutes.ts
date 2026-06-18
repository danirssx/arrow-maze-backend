import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ProgressController } from './ProgressController.js';

export function createProgressRouter(
  controller: ProgressController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();

  router.get('/progress/me', authMiddleware, (req, res, next) =>
    controller.loadProgress(req, res, next),
  );

  router.post('/progress/levels/:levelId/complete', authMiddleware, (req, res, next) =>
    controller.completeLevel(req, res, next),
  );

  router.put('/progress/sync', authMiddleware, (req, res, next) =>
    controller.syncProgress(req, res, next),
  );

  return router;
}
