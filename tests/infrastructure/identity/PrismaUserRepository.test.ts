import { jest } from "@jest/globals";
import type { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "../../../src/infrastructure/identity/PrismaUserRepository";
import { UserFactory } from "../../../src/domain/identity/UserFactory";
import { Email } from "../../../src/domain/identity/value-objects/Email";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash";
import { Username } from "../../../src/domain/identity/value-objects/Username";
import { UserId } from "../../../src/domain/shared/UserId.js";
import { UserRole } from "../../../src/domain/identity/enums/UserRole";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus";
import { User } from "../../../src/domain/identity/User";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError";

// Subject to human review — infrastructure adapter test

type UserDelegate = {
  upsert: jest.Mock;
  findUnique: jest.Mock;
  count: jest.Mock;
};

function makePrisma(overrides: Partial<UserDelegate> = {}): { prisma: PrismaClient; user: UserDelegate } {
  const user: UserDelegate = {
    upsert: jest.fn().mockResolvedValue(undefined),
    findUnique: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
  return { prisma: { user } as unknown as PrismaClient, user };
}

const makeUser = () =>
  UserFactory.create(
    Email.create("alice@example.com"),
    Username.create("alice"),
    PasswordHash.fromHash("$2b$12$hashedvalue")
  );

const makeRecord = () => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "alice@example.com",
  username: "alice",
  passwordHash: "$2b$12$hashedvalue",
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
});

describe("PrismaUserRepository", () => {
  describe("save", () => {
    it("should_call_upsert_keyed_by_id_when_user_is_valid", async () => {
      // Arrange
      const { prisma, user } = makePrisma();
      const repo = new PrismaUserRepository(prisma);
      const aggregate = makeUser();

      // Act
      await repo.save(aggregate);

      // Assert
      expect(user.upsert).toHaveBeenCalledTimes(1);
      expect(user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: aggregate.id.value },
          create: expect.objectContaining({ email: "alice@example.com", username: "alice" }),
          update: expect.objectContaining({ email: "alice@example.com" }),
        })
      );
    });

    it("should_throw_infrastructure_error_when_query_fails", async () => {
      // Arrange
      const { prisma } = makePrisma({ upsert: jest.fn().mockRejectedValue(new Error("DB error")) });
      const repo = new PrismaUserRepository(prisma);

      // Act / Assert
      await expect(repo.save(makeUser())).rejects.toBeInstanceOf(InfrastructureError);
    });
  });

  describe("findById", () => {
    it("should_return_user_when_record_exists", async () => {
      // Arrange
      const { prisma } = makePrisma({ findUnique: jest.fn().mockResolvedValue(makeRecord()) });
      const repo = new PrismaUserRepository(prisma);

      // Act
      const result = await repo.findById(UserId.create("550e8400-e29b-41d4-a716-446655440000"));

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result?.email.value).toBe("alice@example.com");
    });

    it("should_return_null_when_record_does_not_exist", async () => {
      // Arrange
      const { prisma } = makePrisma({ findUnique: jest.fn().mockResolvedValue(null) });
      const repo = new PrismaUserRepository(prisma);

      // Act
      const result = await repo.findById(UserId.create("550e8400-e29b-41d4-a716-446655440000"));

      // Assert
      expect(result).toBeNull();
    });

    it("should_throw_infrastructure_error_when_query_fails", async () => {
      // Arrange
      const { prisma } = makePrisma({ findUnique: jest.fn().mockRejectedValue(new Error("DB error")) });
      const repo = new PrismaUserRepository(prisma);

      // Act / Assert
      await expect(repo.findById(UserId.create("550e8400-e29b-41d4-a716-446655440000"))).rejects.toBeInstanceOf(
        InfrastructureError
      );
    });
  });

  describe("findByEmail", () => {
    it("should_return_user_when_email_matches", async () => {
      // Arrange
      const { prisma, user } = makePrisma({ findUnique: jest.fn().mockResolvedValue(makeRecord()) });
      const repo = new PrismaUserRepository(prisma);

      // Act
      const result = await repo.findByEmail(Email.create("alice@example.com"));

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(user.findUnique).toHaveBeenCalledWith({ where: { email: "alice@example.com" } });
    });

    it("should_return_null_when_email_does_not_match", async () => {
      // Arrange
      const { prisma } = makePrisma({ findUnique: jest.fn().mockResolvedValue(null) });
      const repo = new PrismaUserRepository(prisma);

      // Act
      const result = await repo.findByEmail(Email.create("nobody@example.com"));

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("existsByEmail", () => {
    it("should_return_true_when_count_is_positive", async () => {
      // Arrange
      const { prisma } = makePrisma({ count: jest.fn().mockResolvedValue(1) });
      const repo = new PrismaUserRepository(prisma);

      // Act
      const result = await repo.existsByEmail(Email.create("alice@example.com"));

      // Assert
      expect(result).toBe(true);
    });

    it("should_return_false_when_count_is_zero", async () => {
      // Arrange
      const { prisma } = makePrisma({ count: jest.fn().mockResolvedValue(0) });
      const repo = new PrismaUserRepository(prisma);

      // Act
      const result = await repo.existsByEmail(Email.create("new@example.com"));

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("existsByUsername", () => {
    it("should_return_true_when_count_is_positive", async () => {
      // Arrange
      const { prisma } = makePrisma({ count: jest.fn().mockResolvedValue(1) });
      const repo = new PrismaUserRepository(prisma);

      // Act
      const result = await repo.existsByUsername(Username.create("alice"));

      // Assert
      expect(result).toBe(true);
    });

    it("should_return_false_when_count_is_zero", async () => {
      // Arrange
      const { prisma } = makePrisma({ count: jest.fn().mockResolvedValue(0) });
      const repo = new PrismaUserRepository(prisma);

      // Act
      const result = await repo.existsByUsername(Username.create("newuser"));

      // Assert
      expect(result).toBe(false);
    });
  });
});
