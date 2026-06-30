import { Router } from "express";
import type { IdentityController } from "./IdentityController.js";

export function createIdentityRouter(controller: IdentityController): Router {
  const router = Router();

  router.post("/auth/register", (req, res, next) => controller.register(req, res, next));
  router.post("/auth/login", (req, res, next) => controller.login(req, res, next));
  router.post("/auth/refresh", (req, res, next) => controller.refresh(req, res, next));
  router.post("/auth/logout", (req, res, next) => controller.logout(req, res, next));

  return router;
}
