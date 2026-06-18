import express from 'express';
import type { UseCase } from '../../src/application/aspects/UseCase.js';
import type { GetLeaderboardInput, GetLeaderboardOutput } from '../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { SubmitScoreInput } from '../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import { ConsoleLogger } from '../../src/infrastructure/logging/ConsoleLogger.js';
import { createErrorMiddleware } from '../../src/framework/errors/errorMiddleware.js';
import { LeaderboardController } from '../../src/framework/leaderboard/LeaderboardController.js';
import { createLeaderboardRouter } from '../../src/framework/leaderboard/leaderboardRoutes.js';

export function createLeaderboardTestApp(
  submitScoreUseCase: UseCase<SubmitScoreInput, void>,
  getLeaderboardUseCase: UseCase<GetLeaderboardInput, GetLeaderboardOutput>,
) {
  const app = express();
  app.use(express.json());
  app.use(createLeaderboardRouter(new LeaderboardController(submitScoreUseCase, getLeaderboardUseCase)));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}
