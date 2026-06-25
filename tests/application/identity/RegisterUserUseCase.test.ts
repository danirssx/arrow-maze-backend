import { RegisterUserUseCase } from "../../../src/application/identity/use-cases/RegisterUserUseCase";
import type { PasswordHasher } from "../../../src/application/identity/ports/PasswordHasher";
import type { UserRepository } from "../../../src/application/identity/ports/UserRepository";
import type { IdGenerator } from "../../../src/application/ports/IdGenerator";
import type { Clock } from "../../../src/application/ports/Clock";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash";
import type { RawPassword } from "../../../src/domain/identity/value-objects/RawPassword";
import type { User } from "../../../src/domain/identity/User";
import type { Email } from "../../../src/domain/identity/value-objects/Email";
import type { UserId } from "../../../src/domain/shared/UserId.js";
import type { Username } from "../../../src/domain/identity/value-objects/Username";
import { ConflictError } from "../../../src/shared/errors/ApplicationError";

const FAKE_ID = "550e8400-e29b-41d4-a716-446655440000";
const FAKE_NOW = new Date("2024-01-15T10:00:00.000Z");

class FakeIdGenerator implements IdGenerator {
  generate(): string { return FAKE_ID; }
}

class FakeClock implements Clock {
  now(): Date { return FAKE_NOW; }
}

// Subject to human review — application use case test

class FakeUserRepository implements UserRepository {
  savedUsers: User[] = [];
  emailExists = false;
  usernameExists = false;

  async save(user: User): Promise<void> { this.savedUsers.push(user); }
  async findById(_id: UserId): Promise<User | null> { return null; }
  async findByEmail(_email: Email): Promise<User | null> { return null; }
  async existsByEmail(_email: Email): Promise<boolean> { return this.emailExists; }
  async existsByUsername(_username: Username): Promise<boolean> { return this.usernameExists; }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(_raw: RawPassword): Promise<PasswordHash> {
    return PasswordHash.fromHash("$2b$12$fakehash");
  }
  async verify(_raw: RawPassword, _stored: PasswordHash): Promise<boolean> { return true; }
}

const VALID_INPUT = { email: "alice@example.com", username: "alice", rawPassword: "ValidPass1!" };

describe("RegisterUserUseCase", () => {
  it("should_return_userId_when_registration_succeeds", async () => {
    // Arrange
    const repo = new FakeUserRepository();
    const useCase = new RegisterUserUseCase(repo, new FakePasswordHasher(), new FakeIdGenerator(), new FakeClock());

    // Act
    const result = await useCase.execute(VALID_INPUT);

    // Assert
    expect(result.userId).toBe(FAKE_ID);
  });

  it("should_persist_user_when_registration_succeeds", async () => {
    // Arrange
    const repo = new FakeUserRepository();
    const useCase = new RegisterUserUseCase(repo, new FakePasswordHasher(), new FakeIdGenerator(), new FakeClock());

    // Act
    await useCase.execute(VALID_INPUT);

    // Assert
    expect(repo.savedUsers).toHaveLength(1);
    expect(repo.savedUsers[0].email.value).toBe("alice@example.com");
    expect(repo.savedUsers[0].username.value).toBe("alice");
  });

  it("should_store_hashed_password_not_raw_when_registration_succeeds", async () => {
    // Arrange
    const repo = new FakeUserRepository();
    const useCase = new RegisterUserUseCase(repo, new FakePasswordHasher(), new FakeIdGenerator(), new FakeClock());

    // Act
    await useCase.execute(VALID_INPUT);

    // Assert
    expect(repo.savedUsers[0].passwordHash.value).toBe("$2b$12$fakehash");
    expect(repo.savedUsers[0].passwordHash.value).not.toBe(VALID_INPUT.rawPassword);
  });

  it("should_throw_conflict_error_when_email_already_exists", async () => {
    // Arrange
    const repo = new FakeUserRepository();
    repo.emailExists = true;
    const useCase = new RegisterUserUseCase(repo, new FakePasswordHasher(), new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_throw_conflict_error_when_username_already_taken", async () => {
    // Arrange
    const repo = new FakeUserRepository();
    repo.usernameExists = true;
    const useCase = new RegisterUserUseCase(repo, new FakePasswordHasher(), new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(ConflictError);
  });

  it("should_throw_domain_error_when_email_format_is_invalid", async () => {
    // Arrange
    const useCase = new RegisterUserUseCase(new FakeUserRepository(), new FakePasswordHasher(), new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(useCase.execute({ ...VALID_INPUT, email: "not-an-email" })).rejects.toThrow();
  });

  it("should_throw_domain_error_when_password_is_too_short", async () => {
    // Arrange
    const useCase = new RegisterUserUseCase(new FakeUserRepository(), new FakePasswordHasher(), new FakeIdGenerator(), new FakeClock());

    // Act / Assert
    await expect(useCase.execute({ ...VALID_INPUT, rawPassword: "short" })).rejects.toThrow();
  });
});
