import { jest } from "@jest/globals";
import type { PrismaClient } from "@prisma/client";
import { PrismaLevelRepository } from "../../../src/infrastructure/level-catalog/PrismaLevelRepository.js";
import { Level } from "../../../src/domain/level-catalog/Level.js";
import { LevelId } from "../../../src/domain/shared/LevelId.js";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError.js";
import { makePublishedLevel, VALID_UUID } from "../../application/level-catalog/helpers/levelFixtures.js";

// Subject to human review — infrastructure adapter test

type LevelDelegate = { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };

function makePrisma(overrides: Partial<LevelDelegate> = {}): { prisma: PrismaClient; level: LevelDelegate } {
  const level: LevelDelegate = {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { prisma: { level } as unknown as PrismaClient, level };
}

function makeRecord() {
  return {
    id: VALID_UUID,
    name: "Test Level",
    description: "A test level",
    difficulty: "EASY",
    status: "PUBLISHED",
    version: 1,
    arrows: [{ id: "a", color: "#5262FB", path: [{ row: 0, col: 0 }], direction: "UP" }],
    attempts: 5,
    timeLimitSeconds: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("PrismaLevelRepository", () => {
  describe("findById", () => {
    it("should_return_level_when_record_exists", async () => {
      // Arrange
      const { prisma } = makePrisma({ findUnique: jest.fn().mockResolvedValue(makeRecord()) });
      const repo = new PrismaLevelRepository(prisma);

      // Act
      const result = await repo.findById(LevelId.create(VALID_UUID));

      // Assert
      expect(result).toBeInstanceOf(Level);
      expect(result?.id.value).toBe(VALID_UUID);
      expect(result?.name.value).toBe("Test Level");
    });

    it("should_return_null_when_record_does_not_exist", async () => {
      // Arrange
      const { prisma } = makePrisma({ findUnique: jest.fn().mockResolvedValue(null) });
      const repo = new PrismaLevelRepository(prisma);

      // Act
      const result = await repo.findById(LevelId.create(VALID_UUID));

      // Assert
      expect(result).toBeNull();
    });

    it("should_throw_infrastructure_error_when_query_fails", async () => {
      // Arrange
      const { prisma } = makePrisma({ findUnique: jest.fn().mockRejectedValue(new Error("DB down")) });
      const repo = new PrismaLevelRepository(prisma);

      // Act / Assert
      await expect(repo.findById(LevelId.create(VALID_UUID))).rejects.toBeInstanceOf(InfrastructureError);
    });
  });

  describe("findAllPublished", () => {
    it("should_return_published_levels_ordered_by_created_at", async () => {
      // Arrange
      const { prisma, level } = makePrisma({ findMany: jest.fn().mockResolvedValue([makeRecord()]) });
      const repo = new PrismaLevelRepository(prisma);

      // Act
      const result = await repo.findAllPublished();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Level);
      expect(level.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "asc" } })
      );
    });

    it("should_return_empty_array_when_no_levels_published", async () => {
      // Arrange
      const { prisma } = makePrisma({ findMany: jest.fn().mockResolvedValue([]) });
      const repo = new PrismaLevelRepository(prisma);

      // Act
      const result = await repo.findAllPublished();

      // Assert
      expect(result).toEqual([]);
    });

    it("should_throw_infrastructure_error_when_query_fails", async () => {
      // Arrange
      const { prisma } = makePrisma({ findMany: jest.fn().mockRejectedValue(new Error("DB down")) });
      const repo = new PrismaLevelRepository(prisma);

      // Act / Assert
      await expect(repo.findAllPublished()).rejects.toBeInstanceOf(InfrastructureError);
    });
  });

  describe("save", () => {
    it("should_upsert_level_with_arrows_payload", async () => {
      // Arrange
      const { prisma, level } = makePrisma();
      const repo = new PrismaLevelRepository(prisma);

      // Act
      await repo.save(makePublishedLevel());

      // Assert
      expect(level.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: VALID_UUID },
          create: expect.objectContaining({
            id: VALID_UUID,
            status: "PUBLISHED",
            arrows: expect.arrayContaining([expect.objectContaining({ id: "a", direction: "UP" })]),
          }),
        })
      );
    });

    it("should_throw_infrastructure_error_when_save_fails", async () => {
      // Arrange
      const { prisma } = makePrisma({ upsert: jest.fn().mockRejectedValue(new Error("DB error")) });
      const repo = new PrismaLevelRepository(prisma);

      // Act / Assert
      await expect(repo.save(makePublishedLevel())).rejects.toBeInstanceOf(InfrastructureError);
    });
  });
});
