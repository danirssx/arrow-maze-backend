import { GetCurrentUserUseCase } from "../../../src/application/identity/use-cases/GetCurrentUserUseCase";
import type { UserRepository } from "../../../src/application/identity/ports/UserRepository";
import { User } from "../../../src/domain/identity/User";
import { UserRole } from "../../../src/domain/identity/enums/UserRole";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus";
import { Email } from "../../../src/domain/identity/value-objects/Email";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash";
import { Username } from "../../../src/domain/identity/value-objects/Username";
import { UserId } from "../../../src/domain/shared/UserId.js";
import type { Email as EmailType } from "../../../src/domain/identity/value-objects/Email";
import type { UserId as UserIdType } from "../../../src/domain/shared/UserId.js";
import type { Username as UsernameType } from "../../../src/domain/identity/value-objects/Username";
import { NotFoundError, UnauthorizedError } from "../../../src/shared/errors/ApplicationError";

// Subject to human review — application use case test

const FIXED_ID = "550e8400-e29b-41d4-a716-446655440000";

const makeUser = () =>
  User.reconstitute(
    UserId.create(FIXED_ID),
    Email.create("alice@example.com"),
    Username.create("alice"),
    PasswordHash.fromHash("$2b$12$hashedvalue"),
    UserRole.USER,
    UserStatus.ACTIVE,
    new Date(),
    new Date()
  );

class FakeUserRepository implements UserRepository {
  findByIdCalls = 0;
  constructor(private readonly user: User | null = null) {}
  async save(_user: User): Promise<void> {}
  async findById(_id: UserIdType): Promise<User | null> {
    this.findByIdCalls++;
    return this.user;
  }
  async findByEmail(_email: EmailType): Promise<User | null> { return null; }
  async existsByEmail(_email: EmailType): Promise<boolean> { return false; }
  async existsByUsername(_username: UsernameType): Promise<boolean> { return false; }
}

describe("GetCurrentUserUseCase", () => {
  it("should_return_profile_dto_when_user_exists", async () => {
    // Arrange
    const useCase = new GetCurrentUserUseCase(new FakeUserRepository(makeUser()));

    // Act
    const result = await useCase.execute({ userId: FIXED_ID });

    // Assert
    expect(result).toEqual({
      userId: FIXED_ID,
      email: "alice@example.com",
      username: "alice",
      role: UserRole.USER,
    });
  });

  it("should_not_expose_password_hash_in_output", async () => {
    // Arrange
    const useCase = new GetCurrentUserUseCase(new FakeUserRepository(makeUser()));

    // Act
    const result = await useCase.execute({ userId: FIXED_ID });

    // Assert
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("should_throw_not_found_error_with_message_when_user_does_not_exist", async () => {
    // Arrange
    const useCase = new GetCurrentUserUseCase(new FakeUserRepository(null));

    // Act
    const error = await useCase.execute({ userId: FIXED_ID }).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as Error).message).toBe("User not found");
  });

  it("should_throw_unauthorized_error_with_message_and_not_query_repository_when_user_id_is_malformed", async () => {
    // Arrange
    const repo = new FakeUserRepository(makeUser());
    const useCase = new GetCurrentUserUseCase(repo);

    // Act
    const error = await useCase.execute({ userId: "not-a-uuid" }).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect((error as Error).message).toBe("Invalid credentials");
    expect(repo.findByIdCalls).toBe(0);
  });
});
