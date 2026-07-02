import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { LoginUseCase } from "../application/identity/use-cases/LoginUseCase.js";
import { RegisterUserUseCase } from "../application/identity/use-cases/RegisterUserUseCase.js";
import { LogoutUseCase } from "../application/identity/use-cases/LogoutUseCase.js";
import { RefreshAccessTokenUseCase } from "../application/identity/use-cases/RefreshAccessTokenUseCase.js";
import { GetCurrentUserUseCase } from "../application/identity/use-cases/GetCurrentUserUseCase.js";
import { ListUsersUseCase } from "../application/identity/use-cases/ListUsersUseCase.js";
import { CompleteLevelService } from "../application/progress/use-cases/CompleteLevelService.js";
import { LoadProgressService } from "../application/progress/use-cases/LoadProgressService.js";
import { SyncProgressService } from "../application/progress/use-cases/SyncProgressService.js";
import { GetLeaderboardService } from "../application/leaderboard/use-cases/GetLeaderboardService.js";
import { SubmitScoreService } from "../application/leaderboard/use-cases/SubmitScoreService.js";
import { GetLevelsUseCase } from "../application/level-catalog/use-cases/GetLevelsUseCase.js";
import { GetLevelUseCase } from "../application/level-catalog/use-cases/GetLevelUseCase.js";
import { CreateLevelUseCase } from "../application/level-catalog/use-cases/CreateLevelUseCase.js";
import { UpdateLevelDefinitionUseCase } from "../application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.js";
import { PublishLevelUseCase } from "../application/level-catalog/use-cases/PublishLevelUseCase.js";
import { ArchiveLevelUseCase } from "../application/level-catalog/use-cases/ArchiveLevelUseCase.js";
import { ListAdminLevelsUseCase } from "../application/level-catalog/use-cases/ListAdminLevelsUseCase.js";
import { TransactionDecorator } from "../application/aspects/TransactionDecorator.js";
import { UseCaseLoggingDecorator } from "../application/aspects/UseCaseLoggingDecorator.js";
import { BcryptPasswordHasher } from "../infrastructure/identity/BcryptPasswordHasher.js";
import { JwtTokenService } from "../infrastructure/identity/JwtTokenService.js";
import { PrismaUnitOfWork } from "../infrastructure/database/PrismaUnitOfWork.js";
import { PrismaUserRepository } from "../infrastructure/identity/PrismaUserRepository.js";
import { CryptoRefreshTokenGenerator } from "../infrastructure/identity/CryptoRefreshTokenGenerator.js";
import { PrismaRefreshTokenRepository } from "../infrastructure/identity/PrismaRefreshTokenRepository.js";
import { PrismaProgressRepository } from "../infrastructure/progress/PrismaProgressRepository.js";
import { PrismaLeaderboardRepository } from "../infrastructure/leaderboard/PrismaLeaderboardRepository.js";
import { PrismaLevelRepository } from "../infrastructure/level-catalog/PrismaLevelRepository.js";
import { LevelSolvabilityPolicy } from "../domain/level-catalog/LevelSolvabilityPolicy.js";
import { InMemoryEventBus } from "../infrastructure/events/InMemoryEventBus.js";
import { UuidIdGenerator } from "../infrastructure/shared/UuidIdGenerator.js";
import { SystemClock } from "../infrastructure/shared/SystemClock.js";
import { createPrismaClient } from "../infrastructure/database/PrismaClientProvider.js";
import { ConsoleLogger } from "../infrastructure/logging/ConsoleLogger.js";
import { loadEnvironment } from "./config/environment.js";
import { createAuthMiddleware } from "./middleware/authMiddleware.js";
import { createErrorMiddleware } from "./errors/errorMiddleware.js";
import { notFoundMiddleware } from "./errors/notFoundMiddleware.js";
import { IdentityController } from "./identity/IdentityController.js";
import { UserController } from "./identity/UserController.js";
import { AdminUserController } from "./identity/AdminUserController.js";
import { ProgressController } from "./progress/ProgressController.js";
import { LeaderboardController } from "./leaderboard/LeaderboardController.js";
import { LevelCatalogController } from "./level-catalog/LevelCatalogController.js";
import { AdminLevelController } from "./level-catalog/AdminLevelController.js";
import { createIdentityRouter } from "./identity/identityRoutes.js";
import { createUserRouter } from "./identity/userRoutes.js";
import { createAdminUserRouter } from "./identity/adminUserRoutes.js";
import { createProgressRouter } from "./progress/progressRoutes.js";
import { createLeaderboardRouter } from "./leaderboard/leaderboardRoutes.js";
import { createLevelCatalogRouter } from "./level-catalog/levelCatalogRoutes.js";
import { createAdminLevelRouter } from "./level-catalog/adminLevelRoutes.js";
import { createHealthRouter } from "./routes/healthRoutes.js";
import { openApiSpec } from "./swagger/openApiSpec.js";

export function createApp() {
  const environment = loadEnvironment();
  const logger = new ConsoleLogger();

  const prisma = createPrismaClient(environment.databaseUrl, { ssl: environment.databaseSsl });
  const userRepository = new PrismaUserRepository(prisma);
  const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
  const refreshTokenGenerator = new CryptoRefreshTokenGenerator();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(environment.jwtSecret, environment.jwtAccessExpiresIn);
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const eventBus = new InMemoryEventBus(logger);

  const idGenerator = new UuidIdGenerator();
  const clock = new SystemClock();
  const refreshTtlMs = environment.refreshTokenTtlDays * 24 * 60 * 60 * 1000;

  const progressRepository = new PrismaProgressRepository(prisma);
  const leaderboardRepository = new PrismaLeaderboardRepository(prisma);
  const levelRepository = new PrismaLevelRepository(prisma);
  const solvabilityPolicy = new LevelSolvabilityPolicy();

  const registerUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator("RegisterUserUseCase", new RegisterUserUseCase(userRepository, passwordHasher, idGenerator, clock), logger),
    unitOfWork
  );
  const loginUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator(
      "LoginUseCase",
      new LoginUseCase(
        userRepository,
        passwordHasher,
        tokenService,
        refreshTokenRepository,
        refreshTokenGenerator,
        idGenerator,
        clock,
        refreshTtlMs,
      ),
      logger
    ),
    unitOfWork
  );
  const refreshUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator(
      "RefreshAccessTokenUseCase",
      new RefreshAccessTokenUseCase(
        refreshTokenRepository,
        userRepository,
        refreshTokenGenerator,
        tokenService,
        idGenerator,
        clock,
        refreshTtlMs,
      ),
      logger
    ),
    unitOfWork
  );
  const logoutUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator(
      "LogoutUseCase",
      new LogoutUseCase(refreshTokenRepository, refreshTokenGenerator, clock),
      logger
    ),
    unitOfWork
  );
  const getCurrentUserUseCase = new UseCaseLoggingDecorator(
    "GetCurrentUserUseCase",
    new GetCurrentUserUseCase(userRepository),
    logger
  );
  const listUsersUseCase = new UseCaseLoggingDecorator(
    "ListUsersUseCase",
    new ListUsersUseCase(userRepository),
    logger
  );

  const loadProgressUseCase = new UseCaseLoggingDecorator(
    "LoadProgressService",
    new LoadProgressService(progressRepository, idGenerator, clock),
    logger
  );
  const completeLevelUseCase = new UseCaseLoggingDecorator(
    "CompleteLevelService",
    new CompleteLevelService(progressRepository, eventBus, idGenerator, clock),
    logger
  );
  const syncProgressUseCase = new UseCaseLoggingDecorator(
    "SyncProgressService",
    new SyncProgressService(progressRepository, eventBus, idGenerator, clock),
    logger
  );

  const getLeaderboardUseCase = new UseCaseLoggingDecorator(
    "GetLeaderboardService",
    new GetLeaderboardService(leaderboardRepository, levelRepository),
    logger
  );
  const submitScoreUseCase = new UseCaseLoggingDecorator(
    "SubmitScoreService",
    new SubmitScoreService(leaderboardRepository, userRepository, levelRepository, eventBus, idGenerator, clock),
    logger
  );

  const getLevelsUseCase = new UseCaseLoggingDecorator(
    "GetLevelsUseCase",
    new GetLevelsUseCase(levelRepository),
    logger
  );
  const getLevelUseCase = new UseCaseLoggingDecorator(
    "GetLevelUseCase",
    new GetLevelUseCase(levelRepository),
    logger
  );
  const createLevelUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator("CreateLevelUseCase", new CreateLevelUseCase(levelRepository, idGenerator, clock), logger),
    unitOfWork
  );
  const updateDefinitionUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator("UpdateLevelDefinitionUseCase", new UpdateLevelDefinitionUseCase(levelRepository, clock), logger),
    unitOfWork
  );
  const publishLevelUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator("PublishLevelUseCase", new PublishLevelUseCase(levelRepository, solvabilityPolicy, clock), logger),
    unitOfWork
  );
  const archiveLevelUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator("ArchiveLevelUseCase", new ArchiveLevelUseCase(levelRepository, clock), logger),
    unitOfWork
  );
  const listAdminLevelsUseCase = new UseCaseLoggingDecorator(
    "ListAdminLevelsUseCase",
    new ListAdminLevelsUseCase(levelRepository),
    logger
  );

  const identityController = new IdentityController(registerUseCase, loginUseCase, refreshUseCase, logoutUseCase);
  const userController = new UserController(getCurrentUserUseCase);
  const adminUserController = new AdminUserController(listUsersUseCase);
  const progressController = new ProgressController(loadProgressUseCase, completeLevelUseCase, syncProgressUseCase);
  const leaderboardController = new LeaderboardController(submitScoreUseCase, getLeaderboardUseCase);
  const levelCatalogController = new LevelCatalogController(
    getLevelsUseCase,
    getLevelUseCase,
    createLevelUseCase,
    updateDefinitionUseCase,
    publishLevelUseCase,
    archiveLevelUseCase,
  );
  const adminLevelController = new AdminLevelController(listAdminLevelsUseCase);

  const authMiddleware = createAuthMiddleware(tokenService);

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: environment.corsOrigins }));
  app.use(express.json());
  app.use(createHealthRouter());
  app.use(createIdentityRouter(identityController));
  app.use(createUserRouter(userController, authMiddleware));
  app.use(createAdminUserRouter(adminUserController, authMiddleware));
  app.use(createProgressRouter(progressController, authMiddleware));
  app.use(createLeaderboardRouter(leaderboardController, authMiddleware));
  app.use(createLevelCatalogRouter(levelCatalogController, authMiddleware));
  app.use(createAdminLevelRouter(adminLevelController, authMiddleware));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(logger));

  return app;
}
