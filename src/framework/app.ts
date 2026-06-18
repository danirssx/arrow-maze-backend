import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { LoginUseCase } from "../application/identity/use-cases/LoginUseCase.js";
import { RegisterUserUseCase } from "../application/identity/use-cases/RegisterUserUseCase.js";
import { CompleteLevelService } from "../application/progress/use-cases/CompleteLevelService.js";
import { LoadProgressService } from "../application/progress/use-cases/LoadProgressService.js";
import { SyncProgressService } from "../application/progress/use-cases/SyncProgressService.js";
import { GetLeaderboardService } from "../application/leaderboard/use-cases/GetLeaderboardService.js";
import { SubmitScoreService } from "../application/leaderboard/use-cases/SubmitScoreService.js";
import { TransactionDecorator } from "../application/aspects/TransactionDecorator.js";
import { UseCaseLoggingDecorator } from "../application/aspects/UseCaseLoggingDecorator.js";
import { BcryptPasswordHasher } from "../infrastructure/identity/BcryptPasswordHasher.js";
import { JwtTokenService } from "../infrastructure/identity/JwtTokenService.js";
import { PgUnitOfWork } from "../infrastructure/database/PgUnitOfWork.js";
import { PgUserRepository } from "../infrastructure/identity/PgUserRepository.js";
import { PgProgressRepository } from "../infrastructure/progress/PgProgressRepository.js";
import { PgLeaderboardRepository } from "../infrastructure/leaderboard/PgLeaderboardRepository.js";
import { InMemoryEventBus } from "../infrastructure/events/InMemoryEventBus.js";
import { createPool } from "../infrastructure/database/PgPool.js";
import { ConsoleLogger } from "../infrastructure/logging/ConsoleLogger.js";
import { loadEnvironment } from "./config/environment.js";
import { createAuthMiddleware } from "./middleware/authMiddleware.js";
import { createErrorMiddleware } from "./errors/errorMiddleware.js";
import { notFoundMiddleware } from "./errors/notFoundMiddleware.js";
import { IdentityController } from "./identity/IdentityController.js";
import { ProgressController } from "./progress/ProgressController.js";
import { LeaderboardController } from "./leaderboard/LeaderboardController.js";
import { createIdentityRouter } from "./identity/identityRoutes.js";
import { createProgressRouter } from "./progress/progressRoutes.js";
import { createLeaderboardRouter } from "./leaderboard/leaderboardRoutes.js";
import { createHealthRouter } from "./routes/healthRoutes.js";
import { openApiSpec } from "./swagger/openApiSpec.js";

export function createApp() {
  const environment = loadEnvironment();
  const logger = new ConsoleLogger();

  const pool = createPool(environment.databaseUrl, { ssl: environment.databaseSsl });
  const userRepository = new PgUserRepository(pool);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(environment.jwtSecret);
  const unitOfWork = new PgUnitOfWork(pool);
  const eventBus = new InMemoryEventBus(logger);

  const progressRepository = new PgProgressRepository(pool);
  const leaderboardRepository = new PgLeaderboardRepository(pool);

  const registerUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator("RegisterUserUseCase", new RegisterUserUseCase(userRepository, passwordHasher), logger),
    unitOfWork
  );
  const loginUseCase = new UseCaseLoggingDecorator(
    "LoginUseCase",
    new LoginUseCase(userRepository, passwordHasher, tokenService),
    logger
  );

  const loadProgressUseCase = new UseCaseLoggingDecorator(
    "LoadProgressService",
    new LoadProgressService(progressRepository),
    logger
  );
  const completeLevelUseCase = new UseCaseLoggingDecorator(
    "CompleteLevelService",
    new CompleteLevelService(progressRepository, eventBus),
    logger
  );
  const syncProgressUseCase = new UseCaseLoggingDecorator(
    "SyncProgressService",
    new SyncProgressService(progressRepository, eventBus),
    logger
  );

  const getLeaderboardUseCase = new UseCaseLoggingDecorator(
    "GetLeaderboardService",
    new GetLeaderboardService(leaderboardRepository),
    logger
  );
  const submitScoreUseCase = new UseCaseLoggingDecorator(
    "SubmitScoreService",
    new SubmitScoreService(leaderboardRepository, eventBus),
    logger
  );

  const identityController = new IdentityController(registerUseCase, loginUseCase);
  const progressController = new ProgressController(loadProgressUseCase, completeLevelUseCase, syncProgressUseCase);
  const leaderboardController = new LeaderboardController(submitScoreUseCase, getLeaderboardUseCase);

  const authMiddleware = createAuthMiddleware(tokenService);

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: environment.corsOrigin }));
  app.use(express.json());
  app.use(createHealthRouter());
  app.use(createIdentityRouter(identityController));
  app.use(createProgressRouter(progressController, authMiddleware));
  app.use(createLeaderboardRouter(leaderboardController, authMiddleware));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(logger));

  return app;
}
