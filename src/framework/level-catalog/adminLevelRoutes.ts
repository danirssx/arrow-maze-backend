import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AdminLevelController } from './AdminLevelController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

/**
 * Admin level-catalog routes. Every route is authenticated (`authMiddleware`) and gated
 * to ADMIN (`requireAdmin`, MAZ-195). Kept separate from the public `levelCatalogRoutes`
 * so the public read stays untouched.
 */
export function createAdminLevelRouter(
  controller: AdminLevelController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();

  router.get('/admin/levels', authMiddleware, requireAdmin, (req, res, next) =>
    controller.listLevels(req, res, next),
  );

  return router;
}
