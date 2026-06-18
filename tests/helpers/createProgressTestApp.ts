import express from 'express';
import type { UseCase } from '../../src/application/aspects/UseCase.js';
import type { CompleteLevelInput } from '../../src/application/progress/use-cases/CompleteLevelService.js';
import type { LoadProgressInput, LoadProgressOutput } from '../../src/application/progress/use-cases/LoadProgressService.js';
import type { SyncProgressInput, SyncProgressOutput } from '../../src/application/progress/use-cases/SyncProgressService.js';
import type { TokenService } from '../../src/application/identity/ports/TokenService.js';
import { ConsoleLogger } from '../../src/infrastructure/logging/ConsoleLogger.js';
import { createErrorMiddleware } from '../../src/framework/errors/errorMiddleware.js';
import { createAuthMiddleware } from '../../src/framework/middleware/authMiddleware.js';
import { ProgressController } from '../../src/framework/progress/ProgressController.js';
import { createProgressRouter } from '../../src/framework/progress/progressRoutes.js';

export function createProgressTestApp(
  loadUseCase: UseCase<LoadProgressInput, LoadProgressOutput>,
  completeLevelUseCase: UseCase<CompleteLevelInput, void>,
  syncUseCase: UseCase<SyncProgressInput, SyncProgressOutput>,
  tokenService: TokenService,
) {
  const app = express();
  app.use(express.json());
  const controller = new ProgressController(loadUseCase, completeLevelUseCase, syncUseCase);
  const auth = createAuthMiddleware(tokenService);
  app.use(createProgressRouter(controller, auth));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}
