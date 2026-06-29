import express from "express";
import request from "supertest";

import { RegisterUserUseCase } from "../../src/application/identity/use-cases/RegisterUserUseCase.js";
import { LoginUseCase } from "../../src/application/identity/use-cases/LoginUseCase.js";
import { GetCurrentUserUseCase } from "../../src/application/identity/use-cases/GetCurrentUserUseCase.js";
import type { UserRepository } from "../../src/application/identity/ports/UserRepository.js";
import { BcryptPasswordHasher } from "../../src/infrastructure/identity/BcryptPasswordHasher.js";
import { JwtTokenService } from "../../src/infrastructure/identity/JwtTokenService.js";
import { UuidIdGenerator } from "../../src/infrastructure/shared/UuidIdGenerator.js";
import { SystemClock } from "../../src/infrastructure/shared/SystemClock.js";
import { ConsoleLogger } from "../../src/infrastructure/logging/ConsoleLogger.js";
import { IdentityController } from "../../src/framework/identity/IdentityController.js";
import { createIdentityRouter } from "../../src/framework/identity/identityRoutes.js";
import { UserController } from "../../src/framework/identity/UserController.js";
import { createUserRouter } from "../../src/framework/identity/userRoutes.js";
import { createAuthMiddleware } from "../../src/framework/middleware/authMiddleware.js";
import { createErrorMiddleware } from "../../src/framework/errors/errorMiddleware.js";
import type { User } from "../../src/domain/identity/User.js";
import type { Email } from "../../src/domain/identity/value-objects/Email.js";
import type { Username } from "../../src/domain/identity/value-objects/Username.js";
import type { UserId } from "../../src/domain/shared/UserId.js";

// Subject to human review — end-to-end auth integration test.
//
// Real chain: RegisterUserUseCase + LoginUseCase + GetCurrentUserUseCase through the
// real Express routers + auth middleware, with the real BcryptPasswordHasher (cost
// 12) and JwtTokenService. Only persistence is substituted by an in-memory
// UserRepository so the test runs under `npm run verify` without a live Postgres.

class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [];

  async save(user: User): Promise<void> {
    const index = this.users.findIndex((u) => u.id.value === user.id.value);
    if (index >= 0) this.users[index] = user;
    else this.users.push(user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.users.find((u) => u.id.value === id.value) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.users.find((u) => u.email.value === email.value) ?? null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    return this.users.some((u) => u.email.value === email.value);
  }

  async existsByUsername(username: Username): Promise<boolean> {
    return this.users.some((u) => u.username.value === username.value);
  }
}

function buildAuthApp() {
  const repository = new InMemoryUserRepository();
  const hasher = new BcryptPasswordHasher(12);
  const tokenService = new JwtTokenService("e2e-test-secret");

  const registerUseCase = new RegisterUserUseCase(repository, hasher, new UuidIdGenerator(), new SystemClock());
  const loginUseCase = new LoginUseCase(repository, hasher, tokenService);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(repository);

  const app = express();
  app.use(express.json());
  app.use(createIdentityRouter(new IdentityController(registerUseCase, loginUseCase)));
  app.use(createUserRouter(new UserController(getCurrentUserUseCase), createAuthMiddleware(tokenService)));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}

const CREDENTIALS = {
  email: "e2e.player@arrowmaze.test",
  username: "e2e_player",
  rawPassword: "ArrowE2E!Pass",
};

describe("Auth E2E — register, login, authenticated request", () => {
  it("should_register_then_login_then_authorize_users_me_with_the_real_chain", async () => {
    // Arrange
    const app = buildAuthApp();

    // Act — register
    const registerRes = await request(app).post("/auth/register").send(CREDENTIALS);

    // Assert — register
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.status).toBe("success");
    const userId = registerRes.body.data.userId;
    expect(typeof userId).toBe("string");

    // Act — login
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: CREDENTIALS.email, rawPassword: CREDENTIALS.rawPassword });

    // Assert — login
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.accessToken;
    expect(typeof token).toBe("string");
    expect(loginRes.body.data.username).toBe(CREDENTIALS.username);

    // Act — authenticated request with the issued token
    const meRes = await request(app).get("/users/me").set("Authorization", `Bearer ${token}`);

    // Assert — authenticated request
    expect(meRes.status).toBe(200);
    expect(meRes.body.data).toMatchObject({
      userId,
      email: CREDENTIALS.email,
      username: CREDENTIALS.username,
      role: "USER",
    });
    expect(meRes.body.data).not.toHaveProperty("passwordHash");
  });

  it("should_reject_login_with_the_wrong_password", async () => {
    // Arrange
    const app = buildAuthApp();
    await request(app).post("/auth/register").send(CREDENTIALS);

    // Act
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: CREDENTIALS.email, rawPassword: "WrongArrow!Pass" });

    // Assert
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.error.code).toBe("UNAUTHORIZED");
  });
});
