import express from 'express';
import type { UseCase } from '../../src/application/aspects/UseCase.js';
import type {
  GetCurrentUserInput,
  GetCurrentUserOutput,
} from '../../src/application/identity/use-cases/GetCurrentUserUseCase.js';
import type { TokenService } from '../../src/application/identity/ports/TokenService.js';
import { ConsoleLogger } from '../../src/infrastructure/logging/ConsoleLogger.js';
import { createErrorMiddleware } from '../../src/framework/errors/errorMiddleware.js';
import { createAuthMiddleware } from '../../src/framework/middleware/authMiddleware.js';
import { UserController } from '../../src/framework/identity/UserController.js';
import { createUserRouter } from '../../src/framework/identity/userRoutes.js';

export function createUserTestApp(
  getCurrentUserUseCase: UseCase<GetCurrentUserInput, GetCurrentUserOutput>,
  tokenService: TokenService,
) {
  const app = express();
  app.use(express.json());
  const controller = new UserController(getCurrentUserUseCase);
  const auth = createAuthMiddleware(tokenService);
  app.use(createUserRouter(controller, auth));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}
