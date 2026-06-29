import { Router } from "express";
import type { RequestHandler } from "express";
import type { UserController } from "./UserController.js";

export function createUserRouter(
  controller: UserController,
  authMiddleware: RequestHandler
): Router {
  const router = Router();

  router.get("/users/me", authMiddleware, (req, res, next) => controller.me(req, res, next));

  return router;
}
