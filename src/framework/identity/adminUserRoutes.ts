import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AdminUserController } from './AdminUserController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

/**
 * Admin identity routes. Read-only and gated to ADMIN (`authMiddleware` + `requireAdmin`,
 * MAZ-195). No mutations are exposed here.
 */
export function createAdminUserRouter(
  controller: AdminUserController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();

  router.get('/admin/users', authMiddleware, requireAdmin, (req, res, next) =>
    controller.listUsers(req, res, next),
  );

  return router;
}
