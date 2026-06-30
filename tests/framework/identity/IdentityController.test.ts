import type { NextFunction, Request, Response } from "express";
import { IdentityController } from "../../../src/framework/identity/IdentityController";
import type { RegisterUserInput, RegisterUserOutput } from "../../../src/application/identity/use-cases/RegisterUserUseCase";
import type { LoginInput, LoginOutput } from "../../../src/application/identity/use-cases/LoginUseCase";
import type { LogoutInput } from "../../../src/application/identity/use-cases/LogoutUseCase";
import type { RefreshAccessTokenInput, RefreshAccessTokenOutput } from "../../../src/application/identity/use-cases/RefreshAccessTokenUseCase";
import type { UseCase } from "../../../src/application/aspects/UseCase";
import { BadRequestError, ConflictError, UnauthorizedError } from "../../../src/shared/errors/ApplicationError";

// Subject to human review — framework controller test

class FakeRegisterUseCase implements UseCase<RegisterUserInput, RegisterUserOutput> {
  result: RegisterUserOutput = { userId: "550e8400-e29b-41d4-a716-446655440000" };
  error: Error | null = null;

  async execute(_input: RegisterUserInput): Promise<RegisterUserOutput> {
    if (this.error) throw this.error;
    return this.result;
  }
}

class FakeLoginUseCase implements UseCase<LoginInput, LoginOutput> {
  result: LoginOutput = {
    accessToken: "token.signed.here",
    refreshToken: "refresh.token.here",
    userId: "550e8400-e29b-41d4-a716-446655440000",
    username: "alice",
    role: "USER"
  };
  error: Error | null = null;

  async execute(_input: LoginInput): Promise<LoginOutput> {
    if (this.error) throw this.error;
    return this.result;
  }
}

class FakeRefreshUseCase implements UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput> {
  result: RefreshAccessTokenOutput = {
    accessToken: "new.token.signed.here",
    refreshToken: "new.refresh.token.here",
  };
  error: Error | null = null;

  async execute(_input: RefreshAccessTokenInput): Promise<RefreshAccessTokenOutput> {
    if (this.error) throw this.error;
    return this.result;
  }
}

class FakeLogoutUseCase implements UseCase<LogoutInput, void> {
  error: Error | null = null;

  async execute(_input: LogoutInput): Promise<void> {
    if (this.error) throw this.error;
  }
}

const makeController = (
  registerUseCase: UseCase<RegisterUserInput, RegisterUserOutput> = new FakeRegisterUseCase(),
  loginUseCase: UseCase<LoginInput, LoginOutput> = new FakeLoginUseCase(),
  refreshUseCase: UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput> = new FakeRefreshUseCase(),
  logoutUseCase: UseCase<LogoutInput, void> = new FakeLogoutUseCase(),
) => new IdentityController(registerUseCase, loginUseCase, refreshUseCase, logoutUseCase);

const makeResMock = () => {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(data: unknown) { this.body = data; return this; }
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
};

const makeNext = (): NextFunction & { capturedError: unknown } => {
  const next = ((err?: unknown) => { next.capturedError = err; }) as NextFunction & { capturedError: unknown };
  next.capturedError = undefined;
  return next;
};

describe("IdentityController", () => {
  describe("register", () => {
    it("should_return_201_with_userId_when_registration_succeeds", async () => {
      // Arrange
      const registerUseCase = new FakeRegisterUseCase();
      const controller = makeController(registerUseCase);
      const req = { body: { email: "alice@example.com", username: "alice", rawPassword: "ValidPass1!" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.register(req, res, next);

      // Assert
      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({ status: "success", data: { userId: "550e8400-e29b-41d4-a716-446655440000" } });
      expect(next.capturedError).toBeUndefined();
    });

    it("should_call_next_with_bad_request_error_when_email_is_missing", async () => {
      // Arrange
      const controller = makeController();
      const req = { body: { username: "alice", rawPassword: "ValidPass1!" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.register(req, res, next);

      // Assert
      expect(next.capturedError).toBeInstanceOf(BadRequestError);
    });

    it("should_call_next_with_bad_request_error_when_username_is_missing", async () => {
      // Arrange
      const controller = makeController();
      const req = { body: { email: "alice@example.com", rawPassword: "ValidPass1!" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.register(req, res, next);

      // Assert
      expect(next.capturedError).toBeInstanceOf(BadRequestError);
    });

    it("should_call_next_with_bad_request_error_when_rawPassword_is_missing", async () => {
      // Arrange
      const controller = makeController();
      const req = { body: { email: "alice@example.com", username: "alice" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.register(req, res, next);

      // Assert
      expect(next.capturedError).toBeInstanceOf(BadRequestError);
    });

    it("should_call_next_with_use_case_error_when_registration_fails", async () => {
      // Arrange
      const registerUseCase = new FakeRegisterUseCase();
      registerUseCase.error = new ConflictError("Email already registered");
      const controller = makeController(registerUseCase);
      const req = { body: { email: "alice@example.com", username: "alice", rawPassword: "ValidPass1!" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.register(req, res, next);

      // Assert
      expect(next.capturedError).toBeInstanceOf(ConflictError);
    });
  });

  describe("login", () => {
    it("should_return_200_with_token_when_login_succeeds", async () => {
      // Arrange
      const loginUseCase = new FakeLoginUseCase();
      const controller = makeController(new FakeRegisterUseCase(), loginUseCase);
      const req = { body: { email: "alice@example.com", rawPassword: "ValidPass1!" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.login(req, res, next);

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        status: "success",
          data: {
            accessToken: "token.signed.here",
            refreshToken: "refresh.token.here",
            userId: "550e8400-e29b-41d4-a716-446655440000",
            username: "alice",
          role: "USER"
        }
      });
      expect(next.capturedError).toBeUndefined();
    });

    it("should_call_next_with_bad_request_error_when_email_is_missing", async () => {
      // Arrange
      const controller = makeController();
      const req = { body: { rawPassword: "ValidPass1!" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.login(req, res, next);

      // Assert
      expect(next.capturedError).toBeInstanceOf(BadRequestError);
    });

    it("should_call_next_with_bad_request_error_when_rawPassword_is_missing", async () => {
      // Arrange
      const controller = makeController();
      const req = { body: { email: "alice@example.com" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.login(req, res, next);

      // Assert
      expect(next.capturedError).toBeInstanceOf(BadRequestError);
    });

    it("should_call_next_with_use_case_error_when_credentials_are_invalid", async () => {
      // Arrange
      const loginUseCase = new FakeLoginUseCase();
      loginUseCase.error = new UnauthorizedError("Invalid credentials");
      const controller = makeController(new FakeRegisterUseCase(), loginUseCase);
      const req = { body: { email: "alice@example.com", rawPassword: "ValidPass1!" } } as Request;
      const res = makeResMock();
      const next = makeNext();

      // Act
      await controller.login(req, res, next);

      // Assert
      expect(next.capturedError).toBeInstanceOf(UnauthorizedError);
    });
  });
});
