import { Router } from 'express';
import type { LeaderboardController } from './LeaderboardController.js';

export function createLeaderboardRouter(controller: LeaderboardController): Router {
  const router = Router();

  router.post('/leaderboard/scores', (req, res, next) => controller.submitScore(req, res, next));
  router.get('/leaderboard/:levelId', (req, res, next) => controller.getLeaderboard(req, res, next));

  return router;
}
