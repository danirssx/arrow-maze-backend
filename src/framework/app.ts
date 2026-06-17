import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { LoginUseCase } from "../application/identity/use-cases/LoginUseCase.js";
import { RegisterUserUseCase } from "../application/identity/use-cases/RegisterUserUseCase.js";
import { TransactionDecorator } from "../application/aspects/TransactionDecorator.js";
import { UseCaseLoggingDecorator } from "../application/aspects/UseCaseLoggingDecorator.js";
import { BcryptPasswordHasher } from "../infrastructure/identity/BcryptPasswordHasher.js";
import { JwtTokenService } from "../infrastructure/identity/JwtTokenService.js";
import { PgUnitOfWork } from "../infrastructure/database/PgUnitOfWork.js";
import { PgUserRepository } from "../infrastructure/identity/PgUserRepository.js";
import { createPool } from "../infrastructure/database/PgPool.js";
import { ConsoleLogger } from "../infrastructure/logging/ConsoleLogger.js";
import { loadEnvironment } from "./config/environment.js";
import { createErrorMiddleware } from "./errors/errorMiddleware.js";
import { notFoundMiddleware } from "./errors/notFoundMiddleware.js";
import { IdentityController } from "./identity/IdentityController.js";
import { createIdentityRouter } from "./identity/identityRoutes.js";
import { createHealthRouter } from "./routes/healthRoutes.js";
import { openApiSpec } from "./swagger/openApiSpec.js";

export function createApp() {
  const environment = loadEnvironment();
  const logger = new ConsoleLogger();

  const pool = createPool(environment.databaseUrl);
  const userRepository = new PgUserRepository(pool);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(environment.jwtSecret);
  const unitOfWork = new PgUnitOfWork(pool);

  const registerUseCase = new TransactionDecorator(
    new UseCaseLoggingDecorator("RegisterUserUseCase", new RegisterUserUseCase(userRepository, passwordHasher), logger),
    unitOfWork
  );
  const loginUseCase = new UseCaseLoggingDecorator(
    "LoginUseCase",
    new LoginUseCase(userRepository, passwordHasher, tokenService),
    logger
  );

  const identityController = new IdentityController(registerUseCase, loginUseCase);

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: environment.corsOrigin }));
  app.use(express.json());
  app.use(createHealthRouter());
  app.use(createIdentityRouter(identityController));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(logger));

  return app;
}
