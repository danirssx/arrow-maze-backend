import request from "supertest";
import type { UseCase } from "../../../src/application/aspects/UseCase";
import type { RegisterUserInput, RegisterUserOutput } from "../../../src/application/identity/use-cases/RegisterUserUseCase";
import type { LoginInput, LoginOutput } from "../../../src/application/identity/use-cases/LoginUseCase";
import type { RefreshAccessTokenInput, RefreshAccessTokenOutput } from "../../../src/application/identity/use-cases/RefreshAccessTokenUseCase";
import type { LogoutInput } from "../../../src/application/identity/use-cases/LogoutUseCase";
import { UnauthorizedError } from "../../../src/shared/errors/ApplicationError";
import { createTestApp } from "../../helpers/createTestApp";

class FakeRegisterUseCase implements UseCase<RegisterUserInput, RegisterUserOutput> {
  async execute(): Promise<RegisterUserOutput> { return { userId: "550e8400-e29b-41d4-a716-446655440000" }; }
}
class FakeLoginUseCase implements UseCase<LoginInput, LoginOutput> {
  async execute(): Promise<LoginOutput> {
    return { accessToken: "a", refreshToken: "r", userId: "u", username: "n", role: "USER" };
  }
}
class FakeLogoutUseCase implements UseCase<LogoutInput, void> {
  async execute(): Promise<void> {}
}
class FakeRefreshUseCase implements UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput> {
  result: RefreshAccessTokenOutput = { accessToken: "new-access", refreshToken: "new-refresh" };
  error: Error | null = null;
  async execute(_input: RefreshAccessTokenInput): Promise<RefreshAccessTokenOutput> {
    if (this.error) throw this.error;
    return this.result;
  }
}

const makeApp = (refresh = new FakeRefreshUseCase()) =>
  createTestApp(new FakeRegisterUseCase(), new FakeLoginUseCase(), refresh, new FakeLogoutUseCase());

describe("POST /auth/refresh", () => {
  it("should_return_200_with_new_tokens_when_refresh_succeeds", async () => {
    const res = await request(makeApp()).post("/auth/refresh").send({ refreshToken: "raw" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.accessToken).toBe("new-access");
    expect(res.body.data.refreshToken).toBe("new-refresh");
  });

  it("should_return_400_when_refreshToken_is_missing", async () => {
    const res = await request(makeApp()).post("/auth/refresh").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("should_return_401_when_refresh_token_is_invalid_or_revoked", async () => {
    const refresh = new FakeRefreshUseCase();
    refresh.error = new UnauthorizedError("Invalid refresh token");

    const res = await request(makeApp(refresh)).post("/auth/refresh").send({ refreshToken: "bad" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
