import request from "supertest";
import type { UseCase } from "../../../src/application/aspects/UseCase";
import type { RegisterUserInput, RegisterUserOutput } from "../../../src/application/identity/use-cases/RegisterUserUseCase";
import type { LoginInput, LoginOutput } from "../../../src/application/identity/use-cases/LoginUseCase";
import type { RefreshAccessTokenInput, RefreshAccessTokenOutput } from "../../../src/application/identity/use-cases/RefreshAccessTokenUseCase";
import type { LogoutInput } from "../../../src/application/identity/use-cases/LogoutUseCase";
import { createTestApp } from "../../helpers/createTestApp";

class FakeRegisterUseCase implements UseCase<RegisterUserInput, RegisterUserOutput> {
  async execute(): Promise<RegisterUserOutput> { return { userId: "550e8400-e29b-41d4-a716-446655440000" }; }
}
class FakeLoginUseCase implements UseCase<LoginInput, LoginOutput> {
  async execute(): Promise<LoginOutput> {
    return { accessToken: "a", refreshToken: "r", userId: "u", username: "n", role: "USER" };
  }
}
class FakeRefreshUseCase implements UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput> {
  async execute(): Promise<RefreshAccessTokenOutput> { return { accessToken: "x", refreshToken: "y" }; }
}
class FakeLogoutUseCase implements UseCase<LogoutInput, void> {
  calledWith: string | null = null;
  async execute(input: LogoutInput): Promise<void> { this.calledWith = input.refreshToken; }
}

const makeApp = (logout = new FakeLogoutUseCase()) =>
  createTestApp(new FakeRegisterUseCase(), new FakeLoginUseCase(), new FakeRefreshUseCase(), logout);

describe("POST /auth/logout", () => {
  it("should_return_200_and_revoke_the_token_when_logout_succeeds", async () => {
    const logout = new FakeLogoutUseCase();

    const res = await request(makeApp(logout)).post("/auth/logout").send({ refreshToken: "raw-token" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(logout.calledWith).toBe("raw-token");
  });

  it("should_return_400_when_refreshToken_is_missing", async () => {
    const res = await request(makeApp()).post("/auth/logout").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});
