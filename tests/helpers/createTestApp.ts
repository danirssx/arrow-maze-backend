import express from "express";
import type { UseCase } from "../../src/application/aspects/UseCase";
import type { LoginInput, LoginOutput } from "../../src/application/identity/use-cases/LoginUseCase";
import type { RegisterUserInput, RegisterUserOutput } from "../../src/application/identity/use-cases/RegisterUserUseCase";
import { ConsoleLogger } from "../../src/infrastructure/logging/ConsoleLogger";
import { createErrorMiddleware } from "../../src/framework/errors/errorMiddleware";
import { IdentityController } from "../../src/framework/identity/IdentityController";
import { createIdentityRouter } from "../../src/framework/identity/identityRoutes";

export function createTestApp(
  registerUseCase: UseCase<RegisterUserInput, RegisterUserOutput>,
  loginUseCase: UseCase<LoginInput, LoginOutput>
) {
  const app = express();
  app.use(express.json());
  app.use(createIdentityRouter(new IdentityController(registerUseCase, loginUseCase)));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}
