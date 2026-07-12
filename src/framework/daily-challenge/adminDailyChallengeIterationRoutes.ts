import { Router } from "express";
import type { RequestHandler } from "express";
import type { AdminDailyChallengeIterationController } from "./AdminDailyChallengeIterationController.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

/**
 * Admin manual daily-challenge iteration routes (MAZ-224). Both routes are
 * authenticated (`authMiddleware`) and gated to ADMIN (`requireAdmin`, MAZ-195),
 * kept separate from the public `GET /daily-challenge` reader.
 */
export function createAdminDailyChallengeIterationRouter(
  controller: AdminDailyChallengeIterationController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.post(
    "/admin/daily-challenge/iterations",
    authMiddleware,
    requireAdmin,
    (req, res, next) => controller.startIteration(req, res, next)
  );

  router.get(
    "/admin/daily-challenge/iterations/:operationId",
    authMiddleware,
    requireAdmin,
    (req, res, next) => controller.getIteration(req, res, next)
  );

  return router;
}
