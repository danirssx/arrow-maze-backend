import express from "express";
import type { UseCase } from "../../src/application/aspects/UseCase";
import type { LoginInput, LoginOutput } from "../../src/application/identity/use-cases/LoginUseCase";
import type { RegisterUserInput, RegisterUserOutput } from "../../src/application/identity/use-cases/RegisterUserUseCase";
import type { LogoutInput } from "../../src/application/identity/use-cases/LogoutUseCase";
import type { RefreshAccessTokenInput, RefreshAccessTokenOutput } from "../../src/application/identity/use-cases/RefreshAccessTokenUseCase";
import { ConsoleLogger } from "../../src/infrastructure/logging/ConsoleLogger";
import { createErrorMiddleware } from "../../src/framework/errors/errorMiddleware";
import { IdentityController } from "../../src/framework/identity/IdentityController";
import { createIdentityRouter } from "../../src/framework/identity/identityRoutes";

class NoopRefreshUseCase implements UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput> {
  async execute(): Promise<RefreshAccessTokenOutput> {
    return { accessToken: "", refreshToken: "" };
  }
}

class NoopLogoutUseCase implements UseCase<LogoutInput, void> {
  async execute(): Promise<void> {}
}

export function createTestApp(
  registerUseCase: UseCase<RegisterUserInput, RegisterUserOutput>,
  loginUseCase: UseCase<LoginInput, LoginOutput>,
  refreshUseCase: UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput> = new NoopRefreshUseCase(),
  logoutUseCase: UseCase<LogoutInput, void> = new NoopLogoutUseCase(),
) {
  const app = express();
  app.use(express.json());
  app.use(createIdentityRouter(new IdentityController(registerUseCase, loginUseCase, refreshUseCase, logoutUseCase)));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}
