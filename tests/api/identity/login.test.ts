import request from "supertest";
import type { UseCase } from "../../../src/application/aspects/UseCase";
import type { RegisterUserInput, RegisterUserOutput } from "../../../src/application/identity/use-cases/RegisterUserUseCase";
import type { LoginInput, LoginOutput } from "../../../src/application/identity/use-cases/LoginUseCase";
import { ForbiddenError, UnauthorizedError } from "../../../src/shared/errors/ApplicationError";
import { createTestApp } from "../../helpers/createTestApp";

class FakeRegisterUseCase implements UseCase<RegisterUserInput, RegisterUserOutput> {
  async execute(_input: RegisterUserInput): Promise<RegisterUserOutput> {
    return { userId: "550e8400-e29b-41d4-a716-446655440000" };
  }
}

class FakeLoginUseCase implements UseCase<LoginInput, LoginOutput> {
  result: LoginOutput = {
    accessToken: "fake.jwt.token",
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

describe("POST /auth/login", () => {
  const VALID_BODY = { email: "alice@example.com", rawPassword: "ValidPass1!" };

  it("should_return_200_with_token_when_login_succeeds", async () => {
    // Arrange
    const app = createTestApp(new FakeRegisterUseCase(), new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/login").send(VALID_BODY);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.accessToken).toBe("fake.jwt.token");
    expect(res.body.data.username).toBe("alice");
    expect(res.body.data.role).toBe("USER");
  });

  it("should_return_400_when_email_is_missing", async () => {
    // Arrange
    const app = createTestApp(new FakeRegisterUseCase(), new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/login").send({ rawPassword: "ValidPass1!" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("should_return_400_when_rawPassword_is_missing", async () => {
    // Arrange
    const app = createTestApp(new FakeRegisterUseCase(), new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/login").send({ email: "alice@example.com" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("should_return_401_when_credentials_are_invalid", async () => {
    // Arrange
    const loginUseCase = new FakeLoginUseCase();
    loginUseCase.error = new UnauthorizedError("Invalid credentials");
    const app = createTestApp(new FakeRegisterUseCase(), loginUseCase);

    // Act
    const res = await request(app).post("/auth/login").send(VALID_BODY);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should_return_403_when_account_is_suspended", async () => {
    // Arrange
    const loginUseCase = new FakeLoginUseCase();
    loginUseCase.error = new ForbiddenError("Account is suspended");
    const app = createTestApp(new FakeRegisterUseCase(), loginUseCase);

    // Act
    const res = await request(app).post("/auth/login").send(VALID_BODY);

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
