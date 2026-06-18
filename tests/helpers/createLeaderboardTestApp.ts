import express from 'express';
import type { UseCase } from '../../src/application/aspects/UseCase.js';
import type { GetLeaderboardInput, GetLeaderboardOutput } from '../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { SubmitScoreInput } from '../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import type { TokenService } from '../../src/application/identity/ports/TokenService.js';
import { ConsoleLogger } from '../../src/infrastructure/logging/ConsoleLogger.js';
import { createErrorMiddleware } from '../../src/framework/errors/errorMiddleware.js';
import { createAuthMiddleware } from '../../src/framework/middleware/authMiddleware.js';
import { LeaderboardController } from '../../src/framework/leaderboard/LeaderboardController.js';
import { createLeaderboardRouter } from '../../src/framework/leaderboard/leaderboardRoutes.js';

export function createLeaderboardTestApp(
  submitScoreUseCase: UseCase<SubmitScoreInput, void>,
  getLeaderboardUseCase: UseCase<GetLeaderboardInput, GetLeaderboardOutput>,
  tokenService: TokenService,
) {
  const app = express();
  app.use(express.json());
  const controller = new LeaderboardController(submitScoreUseCase, getLeaderboardUseCase);
  const auth = createAuthMiddleware(tokenService);
  app.use(createLeaderboardRouter(controller, auth));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}
