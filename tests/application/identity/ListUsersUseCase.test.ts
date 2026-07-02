import { ListUsersUseCase } from "../../../src/application/identity/use-cases/ListUsersUseCase.js";
import type { AdminUserPage, AdminUserRepository } from "../../../src/application/identity/ports/AdminUserRepository.js";
import { User } from "../../../src/domain/identity/User.js";
import { UserRole } from "../../../src/domain/identity/enums/UserRole.js";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus.js";
import { Email } from "../../../src/domain/identity/value-objects/Email.js";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash.js";
import { Username } from "../../../src/domain/identity/value-objects/Username.js";
import { UserId } from "../../../src/domain/shared/UserId.js";

// Subject to human review — application use-case test

const U1 = "550e8400-e29b-41d4-a716-446655440001";
const U2 = "550e8400-e29b-41d4-a716-446655440002";
const FIXED = new Date("2024-01-15T10:00:00.000Z");

function makeUser(id: string, name: string, role = UserRole.USER, status = UserStatus.ACTIVE): User {
  return User.reconstitute(
    UserId.create(id),
    Email.create(`${name}@example.com`),
    Username.create(name),
    PasswordHash.fromHash("$2b$12$hashedvalue"),
    role,
    status,
    FIXED,
    FIXED,
  );
}

class FakeAdminUserRepository implements AdminUserRepository {
  lastOffset = -1;
  lastLimit = -1;
  constructor(private readonly page: AdminUserPage) {}
  async findAll(offset: number, limit: number): Promise<AdminUserPage> {
    this.lastOffset = offset;
    this.lastLimit = limit;
    return this.page;
  }
}

describe("ListUsersUseCase", () => {
  it("should_return_users_without_password_hash", async () => {
    const repo = new FakeAdminUserRepository({
      users: [makeUser(U1, "alice"), makeUser(U2, "bob", UserRole.ADMIN, UserStatus.SUSPENDED)],
      total: 2,
    });

    const result = await new ListUsersUseCase(repo).execute({ page: 1, limit: 20 });

    expect(result.users).toHaveLength(2);
    expect(result.users[0]).toEqual({
      userId: U1,
      email: "alice@example.com",
      username: "alice",
      role: "USER",
      status: "ACTIVE",
      createdAt: FIXED,
    });
    for (const u of result.users) expect(u).not.toHaveProperty("passwordHash");
  });

  it("should_convert_page_to_offset_before_querying", async () => {
    const repo = new FakeAdminUserRepository({ users: [], total: 0 });

    await new ListUsersUseCase(repo).execute({ page: 3, limit: 10 });

    expect(repo.lastOffset).toBe(20);
    expect(repo.lastLimit).toBe(10);
  });

  it("should_return_pagination_metadata", async () => {
    const repo = new FakeAdminUserRepository({ users: [makeUser(U1, "alice")], total: 7 });

    const result = await new ListUsersUseCase(repo).execute({ page: 2, limit: 5 });

    expect(result).toMatchObject({ page: 2, limit: 5, total: 7 });
  });
});
