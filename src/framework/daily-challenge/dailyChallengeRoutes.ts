import { Router } from "express";
import type { DailyChallengeController } from "./DailyChallengeController.js";

export function createDailyChallengeRouter(controller: DailyChallengeController): Router {
  const router = Router();
  router.get("/daily-challenge", (req, res, next) =>
    controller.getDailyChallenge(req, res, next)
  );
  return router;
}
