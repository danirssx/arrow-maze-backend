import { RefreshAccessTokenUseCase } from "../../../src/application/identity/use-cases/RefreshAccessTokenUseCase";
import type { RefreshTokenRepository } from "../../../src/application/identity/ports/RefreshTokenRepository";
import type { RefreshTokenGenerator } from "../../../src/application/identity/ports/RefreshTokenGenerator";
import type { UserRepository } from "../../../src/application/identity/ports/UserRepository";
import type { TokenPayload, TokenService } from "../../../src/application/identity/ports/TokenService";
import type { IdGenerator } from "../../../src/application/ports/IdGenerator";
import type { Clock } from "../../../src/application/ports/Clock";
import { RefreshToken } from "../../../src/domain/identity/RefreshToken";
import { RefreshTokenId } from "../../../src/domain/identity/value-objects/RefreshTokenId";
import { User } from "../../../src/domain/identity/User";
import { UserRole } from "../../../src/domain/identity/enums/UserRole";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus";
import { Email } from "../../../src/domain/identity/value-objects/Email";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash";
import { Username } from "../../../src/domain/identity/value-objects/Username";
import { UserId } from "../../../src/domain/shared/UserId.js";
import type { Email as EmailType } from "../../../src/domain/identity/value-objects/Email";
import type { Username as UsernameType } from "../../../src/domain/identity/value-objects/Username";
import { UnauthorizedError } from "../../../src/shared/errors/ApplicationError";

// Subject to human review — application use case test

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const NEW_ID = "550e8400-e29b-41d4-a716-446655440099";
const NOW = new Date("2024-01-15T10:00:00.000Z");
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  readonly saved: RefreshToken[] = [];
  readonly revokeAllForUserCalls: string[] = [];
  private byHash = new Map<string, RefreshToken>();

  seed(token: RefreshToken): void { this.byHash.set(token.tokenHash, token); }
  async save(token: RefreshToken): Promise<void> {
    this.saved.push(token);
    this.byHash.set(token.tokenHash, token);
  }
  async findByHash(tokenHash: string): Promise<RefreshToken | null> { return this.byHash.get(tokenHash) ?? null; }
  async revokeAllForUser(userId: UserId, now: Date): Promise<void> {
    this.revokeAllForUserCalls.push(userId.value);
    for (const token of this.byHash.values()) {
      if (token.userId.value === userId.value) token.revoke(now);
    }
  }
}

class FakeRefreshTokenGenerator implements RefreshTokenGenerator {
  private counter = 0;
  generate(): string { this.counter += 1; return `raw-${this.counter}`; }
  hash(token: string): string { return `hash:${token}`; }
}

class FakeTokenService implements TokenService {
  lastPayload: TokenPayload | null = null;
  generate(payload: TokenPayload): string { this.lastPayload = payload; return "new-access-token"; }
  verify(_token: string): TokenPayload { return { userId: USER_ID, role: UserRole.USER }; }
}

class FakeUserRepository implements UserRepository {
  constructor(private readonly user: User | null) {}
  async save(): Promise<void> {}
  async findById(_id: UserId): Promise<User | null> { return this.user; }
  async findByEmail(_email: EmailType): Promise<User | null> { return this.user; }
  async existsByEmail(_email: EmailType): Promise<boolean> { return false; }
  async existsByUsername(_username: UsernameType): Promise<boolean> { return false; }
}

class FakeIdGenerator implements IdGenerator {
  generate(): string { return NEW_ID; }
}
class FakeClock implements Clock {
  now(): Date { return NOW; }
}

const activeUser = (status: UserStatus = UserStatus.ACTIVE): User =>
  User.reconstitute(
    UserId.create(USER_ID),
    Email.create("alice@example.com"),
    Username.create("alice"),
    PasswordHash.fromHash("$2b$12$hash"),
    UserRole.USER,
    status,
    NOW,
    NOW,
  );

function makeUseCase(
  repo: FakeRefreshTokenRepository,
  user: User | null = activeUser(),
  tokenService: FakeTokenService = new FakeTokenService(),
): RefreshAccessTokenUseCase {
  return new RefreshAccessTokenUseCase(
    repo,
    new FakeUserRepository(user),
    new FakeRefreshTokenGenerator(),
    tokenService,
    new FakeIdGenerator(),
    new FakeClock(),
    TTL_MS,
  );
}

async function expectInvalidRefreshToken(promise: Promise<unknown>): Promise<void> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(UnauthorizedError);
  expect((error as Error).message).toBe("Invalid refresh token");
}

const storedToken = (hash: string, issuedAt: Date = NOW): RefreshToken =>
  RefreshToken.issue(
    RefreshTokenId.create("550e8400-e29b-41d4-a716-446655440010"),
    UserId.create(USER_ID),
    hash,
    issuedAt,
    TTL_MS,
  );

describe("RefreshAccessTokenUseCase", () => {
  it("should_rotate_and_return_new_access_and_refresh_tokens_when_token_is_active", async () => {
    const repo = new FakeRefreshTokenRepository();
    const original = storedToken("hash:raw-seed");
    repo.seed(original);
    const tokenService = new FakeTokenService();

    const result = await makeUseCase(repo, activeUser(), tokenService).execute({ refreshToken: "raw-seed" });

    expect(result.accessToken).toBe("new-access-token");
    expect(result.refreshToken).toBe("raw-1");
    expect(tokenService.lastPayload).toEqual({ userId: USER_ID, role: UserRole.USER });
    expect(original.isRevoked()).toBe(true);
    expect(original.replacedByTokenId?.value).toBe(NEW_ID);
    expect(repo.saved.some((t) => t.tokenHash === "hash:raw-1")).toBe(true);
  });

  it("should_throw_unauthorized_when_token_is_unknown", async () => {
    const repo = new FakeRefreshTokenRepository();

    await expectInvalidRefreshToken(makeUseCase(repo).execute({ refreshToken: "nope" }));
    expect(repo.saved).toHaveLength(0);
  });

  it("should_throw_unauthorized_and_not_issue_a_token_when_token_is_expired", async () => {
    const repo = new FakeRefreshTokenRepository();
    repo.seed(storedToken("hash:raw-seed", new Date(NOW.getTime() - TTL_MS - 1)));

    await expectInvalidRefreshToken(makeUseCase(repo).execute({ refreshToken: "raw-seed" }));
    expect(repo.saved).toHaveLength(0);
  });

  it("should_throw_unauthorized_and_revoke_the_whole_family_when_a_revoked_token_is_reused", async () => {
    const repo = new FakeRefreshTokenRepository();
    const revoked = storedToken("hash:raw-seed");
    revoked.revoke(NOW);
    repo.seed(revoked);

    await expectInvalidRefreshToken(makeUseCase(repo).execute({ refreshToken: "raw-seed" }));
    expect(repo.revokeAllForUserCalls).toEqual([USER_ID]);
  });

  it("should_throw_unauthorized_when_the_user_is_no_longer_active", async () => {
    const repo = new FakeRefreshTokenRepository();
    repo.seed(storedToken("hash:raw-seed"));

    await expectInvalidRefreshToken(makeUseCase(repo, activeUser(UserStatus.SUSPENDED)).execute({ refreshToken: "raw-seed" }));
    expect(repo.saved).toHaveLength(0);
  });

  it("should_throw_unauthorized_when_the_user_no_longer_exists", async () => {
    const repo = new FakeRefreshTokenRepository();
    repo.seed(storedToken("hash:raw-seed"));

    await expectInvalidRefreshToken(makeUseCase(repo, null).execute({ refreshToken: "raw-seed" }));
  });
});
