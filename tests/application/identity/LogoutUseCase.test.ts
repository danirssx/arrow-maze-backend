import { LogoutUseCase } from "../../../src/application/identity/use-cases/LogoutUseCase";
import type { RefreshTokenRepository } from "../../../src/application/identity/ports/RefreshTokenRepository";
import type { RefreshTokenGenerator } from "../../../src/application/identity/ports/RefreshTokenGenerator";
import type { Clock } from "../../../src/application/ports/Clock";
import { RefreshToken } from "../../../src/domain/identity/RefreshToken";
import { RefreshTokenId } from "../../../src/domain/identity/value-objects/RefreshTokenId";
import { UserId } from "../../../src/domain/shared/UserId.js";

// Subject to human review — application use case test

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const NOW = new Date("2024-01-15T10:00:00.000Z");
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  readonly saved: RefreshToken[] = [];
  private byHash = new Map<string, RefreshToken>();
  seed(token: RefreshToken): void { this.byHash.set(token.tokenHash, token); }
  async save(token: RefreshToken): Promise<void> {
    this.saved.push(token);
    this.byHash.set(token.tokenHash, token);
  }
  async findByHash(tokenHash: string): Promise<RefreshToken | null> { return this.byHash.get(tokenHash) ?? null; }
  async revokeAllForUser(): Promise<void> {}
}

class FakeRefreshTokenGenerator implements RefreshTokenGenerator {
  generate(): string { return "unused"; }
  hash(token: string): string { return `hash:${token}`; }
}

class FakeClock implements Clock {
  now(): Date { return NOW; }
}

const storedToken = (): RefreshToken =>
  RefreshToken.issue(
    RefreshTokenId.create("550e8400-e29b-41d4-a716-446655440010"),
    UserId.create(USER_ID),
    "hash:raw-seed",
    NOW,
    TTL_MS,
  );

function makeUseCase(repo: FakeRefreshTokenRepository): LogoutUseCase {
  return new LogoutUseCase(repo, new FakeRefreshTokenGenerator(), new FakeClock());
}

describe("LogoutUseCase", () => {
  it("should_revoke_the_matching_refresh_token", async () => {
    const repo = new FakeRefreshTokenRepository();
    const token = storedToken();
    repo.seed(token);

    await makeUseCase(repo).execute({ refreshToken: "raw-seed" });

    expect(token.isRevoked()).toBe(true);
    expect(token.revokedAt).toBe(NOW);
    expect(repo.saved).toContain(token);
  });

  it("should_be_a_no_op_when_the_token_is_unknown", async () => {
    const repo = new FakeRefreshTokenRepository();

    await expect(makeUseCase(repo).execute({ refreshToken: "nope" })).resolves.toBeUndefined();
    expect(repo.saved).toHaveLength(0);
  });
});
