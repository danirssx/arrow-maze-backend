import { PgUserRepository } from "../../../src/infrastructure/identity/PgUserRepository";
import { UserFactory } from "../../../src/domain/identity/UserFactory";
import { Email } from "../../../src/domain/identity/value-objects/Email";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash";
import { Username } from "../../../src/domain/identity/value-objects/Username";
import { UserId } from "../../../src/domain/identity/value-objects/UserId";
import { UserRole } from "../../../src/domain/identity/enums/UserRole";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus";
import { User } from "../../../src/domain/identity/User";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError";

// Subject to human review — infrastructure adapter test

type QueryResult<T = unknown> = { rows: T[] };

class FakePool {
  private readonly results: Array<QueryResult | Error>;
  readonly queriesCalled: Array<{ sql: string; params: unknown[] }> = [];

  constructor(results: Array<QueryResult | Error>) {
    this.results = [...results];
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    this.queriesCalled.push({ sql, params });
    const next = this.results.shift();
    if (next instanceof Error) throw next;
    return (next ?? { rows: [] }) as QueryResult<T>;
  }
}

const makeUser = () =>
  UserFactory.create(
    Email.create("alice@example.com"),
    Username.create("alice"),
    PasswordHash.fromHash("$2b$12$hashedvalue")
  );

const makeRow = () => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "alice@example.com",
  username: "alice",
  password_hash: "$2b$12$hashedvalue",
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z")
});

describe("PgUserRepository", () => {
  describe("save", () => {
    it("should_call_insert_query_when_user_is_valid", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [] }]);
      const repo = new PgUserRepository(pool as never);
      const user = makeUser();

      // Act
      await repo.save(user);

      // Assert
      expect(pool.queriesCalled).toHaveLength(1);
      expect(pool.queriesCalled[0].sql).toContain("INSERT INTO users");
      expect(pool.queriesCalled[0].params[0]).toBe(user.id.getValue());
      expect(pool.queriesCalled[0].params[1]).toBe("alice@example.com");
    });

    it("should_throw_infrastructure_error_when_query_fails", async () => {
      // Arrange
      const pool = new FakePool([new Error("DB error")]);
      const repo = new PgUserRepository(pool as never);

      // Act / Assert
      await expect(repo.save(makeUser())).rejects.toBeInstanceOf(InfrastructureError);
    });
  });

  describe("findById", () => {
    it("should_return_user_when_row_exists", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [makeRow()] }]);
      const repo = new PgUserRepository(pool as never);
      const id = UserId.create("550e8400-e29b-41d4-a716-446655440000");

      // Act
      const result = await repo.findById(id);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result?.email.getValue()).toBe("alice@example.com");
    });

    it("should_return_null_when_row_does_not_exist", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [] }]);
      const repo = new PgUserRepository(pool as never);
      const id = UserId.create("550e8400-e29b-41d4-a716-446655440000");

      // Act
      const result = await repo.findById(id);

      // Assert
      expect(result).toBeNull();
    });

    it("should_throw_infrastructure_error_when_query_fails", async () => {
      // Arrange
      const pool = new FakePool([new Error("DB error")]);
      const repo = new PgUserRepository(pool as never);
      const id = UserId.create("550e8400-e29b-41d4-a716-446655440000");

      // Act / Assert
      await expect(repo.findById(id)).rejects.toBeInstanceOf(InfrastructureError);
    });
  });

  describe("findByEmail", () => {
    it("should_return_user_when_email_matches", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [makeRow()] }]);
      const repo = new PgUserRepository(pool as never);

      // Act
      const result = await repo.findByEmail(Email.create("alice@example.com"));

      // Assert
      expect(result).toBeInstanceOf(User);
    });

    it("should_return_null_when_email_does_not_match", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [] }]);
      const repo = new PgUserRepository(pool as never);

      // Act
      const result = await repo.findByEmail(Email.create("nobody@example.com"));

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("existsByEmail", () => {
    it("should_return_true_when_email_exists", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [{ exists: true }] }]);
      const repo = new PgUserRepository(pool as never);

      // Act
      const result = await repo.existsByEmail(Email.create("alice@example.com"));

      // Assert
      expect(result).toBe(true);
    });

    it("should_return_false_when_email_does_not_exist", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [{ exists: false }] }]);
      const repo = new PgUserRepository(pool as never);

      // Act
      const result = await repo.existsByEmail(Email.create("new@example.com"));

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("existsByUsername", () => {
    it("should_return_true_when_username_exists", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [{ exists: true }] }]);
      const repo = new PgUserRepository(pool as never);

      // Act
      const result = await repo.existsByUsername(Username.create("alice"));

      // Assert
      expect(result).toBe(true);
    });

    it("should_return_false_when_username_does_not_exist", async () => {
      // Arrange
      const pool = new FakePool([{ rows: [{ exists: false }] }]);
      const repo = new PgUserRepository(pool as never);

      // Act
      const result = await repo.existsByUsername(Username.create("newuser"));

      // Assert
      expect(result).toBe(false);
    });
  });
});
