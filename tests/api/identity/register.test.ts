import request from "supertest";
import type { UseCase } from "../../../src/application/aspects/UseCase";
import type { RegisterUserInput, RegisterUserOutput } from "../../../src/application/identity/use-cases/RegisterUserUseCase";
import type { LoginInput, LoginOutput } from "../../../src/application/identity/use-cases/LoginUseCase";
import { ConflictError } from "../../../src/shared/errors/ApplicationError";
import { InvalidArgumentError } from "../../../src/domain/errors/DomainError";
import { createTestApp } from "../../helpers/createTestApp";

class FakeRegisterUseCase implements UseCase<RegisterUserInput, RegisterUserOutput> {
  result: RegisterUserOutput = { userId: "550e8400-e29b-41d4-a716-446655440000" };
  error: Error | null = null;
  async execute(_input: RegisterUserInput): Promise<RegisterUserOutput> {
    if (this.error) throw this.error;
    return this.result;
  }
}

class FakeLoginUseCase implements UseCase<LoginInput, LoginOutput> {
  async execute(_input: LoginInput): Promise<LoginOutput> {
    return { accessToken: "tok", userId: "id", username: "u", role: "USER" };
  }
}

describe("POST /auth/register", () => {
  const VALID_BODY = { email: "alice@example.com", username: "alice", rawPassword: "ValidPass1!" };

  it("should_return_201_with_userId_when_registration_succeeds", async () => {
    // Arrange
    const registerUseCase = new FakeRegisterUseCase();
    const app = createTestApp(registerUseCase, new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/register").send(VALID_BODY);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("should_return_400_when_email_is_missing", async () => {
    // Arrange
    const app = createTestApp(new FakeRegisterUseCase(), new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/register").send({ username: "alice", rawPassword: "ValidPass1!" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("should_return_400_when_username_is_missing", async () => {
    // Arrange
    const app = createTestApp(new FakeRegisterUseCase(), new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/register").send({ email: "alice@example.com", rawPassword: "ValidPass1!" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("should_return_400_when_rawPassword_is_missing", async () => {
    // Arrange
    const app = createTestApp(new FakeRegisterUseCase(), new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/register").send({ email: "alice@example.com", username: "alice" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("should_return_409_when_email_is_already_registered", async () => {
    // Arrange
    const registerUseCase = new FakeRegisterUseCase();
    registerUseCase.error = new ConflictError("Email already registered");
    const app = createTestApp(registerUseCase, new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/register").send(VALID_BODY);

    // Assert
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("should_return_400_when_email_format_is_invalid", async () => {
    // Arrange
    const registerUseCase = new FakeRegisterUseCase();
    registerUseCase.error = new InvalidArgumentError("Invalid email format");
    const app = createTestApp(registerUseCase, new FakeLoginUseCase());

    // Act
    const res = await request(app).post("/auth/register").send({ ...VALID_BODY, email: "not-an-email" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ARGUMENT");
  });
});
