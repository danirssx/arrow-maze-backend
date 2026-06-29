import { LoginUseCase } from "../../../src/application/identity/use-cases/LoginUseCase";
import type { PasswordHasher } from "../../../src/application/identity/ports/PasswordHasher";
import type { TokenPayload, TokenService } from "../../../src/application/identity/ports/TokenService";
import type { UserRepository } from "../../../src/application/identity/ports/UserRepository";
import type { RefreshTokenRepository } from "../../../src/application/identity/ports/RefreshTokenRepository";
import type { RefreshTokenGenerator } from "../../../src/application/identity/ports/RefreshTokenGenerator";
import type { IdGenerator } from "../../../src/application/ports/IdGenerator";
import type { Clock } from "../../../src/application/ports/Clock";
import { UserFactory } from "../../../src/domain/identity/UserFactory";
import { User } from "../../../src/domain/identity/User";
import type { RefreshToken } from "../../../src/domain/identity/RefreshToken";
import { UserRole } from "../../../src/domain/identity/enums/UserRole";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus";
import { Email } from "../../../src/domain/identity/value-objects/Email";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash";
import type { RawPassword } from "../../../src/domain/identity/value-objects/RawPassword";
import { UserId } from "../../../src/domain/shared/UserId.js";
import { Username } from "../../../src/domain/identity/value-objects/Username";
import type { Email as EmailType } from "../../../src/domain/identity/value-objects/Email";
import type { UserId as UserIdType } from "../../../src/domain/shared/UserId.js";
import type { Username as UsernameType } from "../../../src/domain/identity/value-objects/Username";
import { ForbiddenError, UnauthorizedError } from "../../../src/shared/errors/ApplicationError";

// Subject to human review — application use case test

const FIXED_ID = "550e8400-e29b-41d4-a716-446655440000";
const NEW_TOKEN_ID = "550e8400-e29b-41d4-a716-446655440099";
const FIXED_NOW = new Date("2024-01-15T10:00:00.000Z");
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const makeActiveUser = () =>
  UserFactory.create(
    UserId.create(FIXED_ID),
    Email.create("alice@example.com"),
    Username.create("alice"),
    PasswordHash.fromHash("$2b$12$hashedvalue"),
    FIXED_NOW,
  );

const makeSuspendedUser = () =>
  User.reconstitute(
    UserId.create(FIXED_ID),
    Email.create("alice@example.com"),
    Username.create("alice"),
    PasswordHash.fromHash("$2b$12$hashedvalue"),
    UserRole.USER,
    UserStatus.SUSPENDED,
    new Date(),
    new Date()
  );

class FakeUserRepository implements UserRepository {
  constructor(private readonly user: User | null = null) {}
  async save(_user: User): Promise<void> {}
  async findById(_id: UserIdType): Promise<User | null> { return null; }
  async findByEmail(_email: EmailType): Promise<User | null> { return this.user; }
  async existsByEmail(_email: EmailType): Promise<boolean> { return false; }
  async existsByUsername(_username: UsernameType): Promise<boolean> { return false; }
}

class FakePasswordHasher implements PasswordHasher {
  constructor(private readonly valid: boolean = true) {}
  async hash(_raw: RawPassword): Promise<PasswordHash> { return PasswordHash.fromHash("hash"); }
  async verify(_raw: RawPassword, _stored: PasswordHash): Promise<boolean> { return this.valid; }
}

class FakeTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return "fake.jwt.token"; }
  verify(_token: string): TokenPayload { return { userId: FIXED_ID, role: UserRole.USER }; }
}

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  readonly saved: RefreshToken[] = [];
  async save(token: RefreshToken): Promise<void> { this.saved.push(token); }
  async findByHash(_tokenHash: string): Promise<RefreshToken | null> { return null; }
  async revokeAllForUser(): Promise<void> {}
}

class FakeRefreshTokenGenerator implements RefreshTokenGenerator {
  generate(): string { return "raw-refresh"; }
  hash(token: string): string { return `hash:${token}`; }
}

class FakeIdGenerator implements IdGenerator {
  generate(): string { return NEW_TOKEN_ID; }
}
class FakeClock implements Clock {
  now(): Date { return FIXED_NOW; }
}

function makeUseCase(
  repo: FakeUserRepository,
  hasher: FakePasswordHasher,
  refreshRepo: FakeRefreshTokenRepository = new FakeRefreshTokenRepository(),
): LoginUseCase {
  return new LoginUseCase(
    repo,
    hasher,
    new FakeTokenService(),
    refreshRepo,
    new FakeRefreshTokenGenerator(),
    new FakeIdGenerator(),
    new FakeClock(),
    TTL_MS,
  );
}

const VALID_INPUT = { email: "alice@example.com", rawPassword: "ValidPass1!" };

describe("LoginUseCase", () => {
  it("should_return_access_token_when_credentials_are_valid", async () => {
    const result = await makeUseCase(new FakeUserRepository(makeActiveUser()), new FakePasswordHasher(true)).execute(VALID_INPUT);
    expect(result.accessToken).toBe("fake.jwt.token");
    expect(result.username).toBe("alice");
    expect(result.role).toBe(UserRole.USER);
  });

  it("should_return_user_data_when_login_succeeds", async () => {
    const result = await makeUseCase(new FakeUserRepository(makeActiveUser()), new FakePasswordHasher(true)).execute(VALID_INPUT);
    expect(result.userId).toBeTruthy();
    expect(result.username).toBe("alice");
    expect(result.role).toBe(UserRole.USER);
  });

  it("should_return_a_refresh_token_when_login_succeeds", async () => {
    const result = await makeUseCase(new FakeUserRepository(makeActiveUser()), new FakePasswordHasher(true)).execute(VALID_INPUT);
    expect(result.refreshToken).toBe("raw-refresh");
  });

  it("should_persist_the_refresh_token_hash_for_the_user_when_login_succeeds", async () => {
    const refreshRepo = new FakeRefreshTokenRepository();
    await makeUseCase(new FakeUserRepository(makeActiveUser()), new FakePasswordHasher(true), refreshRepo).execute(VALID_INPUT);
    expect(refreshRepo.saved).toHaveLength(1);
    expect(refreshRepo.saved[0].tokenHash).toBe("hash:raw-refresh");
    expect(refreshRepo.saved[0].userId.value).toBe(FIXED_ID);
  });

  it("should_throw_unauthorized_error_when_user_is_not_found", async () => {
    await expect(makeUseCase(new FakeUserRepository(null), new FakePasswordHasher(true)).execute(VALID_INPUT)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("should_throw_unauthorized_error_when_password_is_wrong", async () => {
    await expect(makeUseCase(new FakeUserRepository(makeActiveUser()), new FakePasswordHasher(false)).execute(VALID_INPUT)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("should_throw_forbidden_error_when_account_is_suspended", async () => {
    await expect(makeUseCase(new FakeUserRepository(makeSuspendedUser()), new FakePasswordHasher(true)).execute(VALID_INPUT)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_throw_forbidden_error_when_account_is_suspended_even_if_password_is_wrong", async () => {
    // isActive must be checked before bcrypt — suspended account must never reach bcrypt
    await expect(makeUseCase(new FakeUserRepository(makeSuspendedUser()), new FakePasswordHasher(false)).execute(VALID_INPUT)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("should_throw_unauthorized_error_when_email_format_is_invalid", async () => {
    await expect(makeUseCase(new FakeUserRepository(null), new FakePasswordHasher(true)).execute({ email: "bad-email", rawPassword: "ValidPass1!" })).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
