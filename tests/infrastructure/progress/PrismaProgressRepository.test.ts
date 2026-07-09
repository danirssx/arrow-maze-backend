import { jest } from "@jest/globals";
import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaProgressRepository } from "../../../src/infrastructure/progress/PrismaProgressRepository.js";
import { PlayerProgress } from "../../../src/domain/progress/PlayerProgress.js";
import { ProgressId } from "../../../src/domain/progress/value-objects/ProgressId.js";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError.js";
import { UserId } from "../../../src/domain/shared/UserId.js";

// Subject to human review — infrastructure adapter test

const USER_1 = "550e8400-e29b-41d4-a716-446655440001";
const LEVEL_1 = "550e8400-e29b-41d4-a716-446655440010";
const PROGRESS_1 = "550e8400-e29b-41d4-a716-446655440020";
const COMPLETED_LEVEL_1 = "550e8400-e29b-41d4-a716-446655440030";
const FIXED_NOW = new Date("2026-01-01T00:00:00Z");

type ProgressDelegate = { findUnique: jest.Mock };
type TxDelegates = {
  playerProgress: { upsert: jest.Mock };
  completedLevel: { deleteMany: jest.Mock; createMany: jest.Mock };
};

function makeReadPrisma(findUnique: jest.Mock): PrismaClient {
  return { playerProgress: { findUnique } as ProgressDelegate } as unknown as PrismaClient;
}

function makeTx(): TxDelegates {
  return {
    playerProgress: { upsert: jest.fn().mockResolvedValue(undefined) },
    completedLevel: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

function makeWritePrisma(tx: TxDelegates): PrismaClient {
  return {
    $transaction: (cb: (client: unknown) => Promise<unknown>) => cb(tx),
  } as unknown as PrismaClient;
}

function makeEmptyProgress(): PlayerProgress {
  return PlayerProgress.empty(ProgressId.create(PROGRESS_1), UserId.create(USER_1), FIXED_NOW);
}

describe("PrismaProgressRepository", () => {
  describe("findByUserId", () => {
    it("should_return_null_when_no_progress_found", async () => {
      // Arrange
      const repo = new PrismaProgressRepository(makeReadPrisma(jest.fn().mockResolvedValue(null)));

      // Act
      const result = await repo.findByUserId(UserId.create(USER_1));

      // Assert
      expect(result).toBeNull();
    });

    it("should_rehydrate_progress_with_completed_levels_when_found", async () => {
      // Arrange
      const findUnique = jest.fn().mockResolvedValue({
        id: PROGRESS_1,
        userId: USER_1,
        version: 2,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        completedLevels: [
          {
            id: COMPLETED_LEVEL_1,
            levelId: LEVEL_1,
            bestScore: 200,
            bestTimeSeconds: new Prisma.Decimal(25),
            bestMovesCount: 8,
            completedAt: new Date("2026-01-01T00:00:00Z"),
            updatedAt: new Date("2026-01-01T00:00:00Z"),
          },
        ],
      });
      const repo = new PrismaProgressRepository(makeReadPrisma(findUnique));

      // Act
      const result = await repo.findByUserId(UserId.create(USER_1));

      // Assert
      expect(result?.id.value).toBe(PROGRESS_1);
      expect(result?.version.value).toBe(2);
      expect(result?.completedLevels).toHaveLength(1);
      expect(result?.completedLevels[0]?.levelId.value).toBe(LEVEL_1);
      expect(result?.completedLevels[0]?.bestScore.score).toBe(200);
      expect(result?.completedLevels[0]?.bestScore.timeSeconds).toBe(25);
      expect(findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_1 }, include: { completedLevels: true } })
      );
    });

    it("should_throw_infrastructure_error_when_query_fails", async () => {
      // Arrange
      const repo = new PrismaProgressRepository(makeReadPrisma(jest.fn().mockRejectedValue(new Error("DB down"))));

      // Act / Assert
      await expect(repo.findByUserId(UserId.create(USER_1))).rejects.toBeInstanceOf(InfrastructureError);
    });
  });

  describe("save", () => {
    it("should_upsert_progress_and_clear_levels_within_a_transaction", async () => {
      // Arrange
      const tx = makeTx();
      const repo = new PrismaProgressRepository(makeWritePrisma(tx));

      // Act
      await repo.save(makeEmptyProgress());

      // Assert
      expect(tx.playerProgress.upsert).toHaveBeenCalledTimes(1);
      expect(tx.completedLevel.deleteMany).toHaveBeenCalledWith({ where: { progressId: PROGRESS_1 } });
      expect(tx.completedLevel.createMany).not.toHaveBeenCalled();
    });

    it("should_throw_infrastructure_error_when_save_fails", async () => {
      // Arrange
      const tx = makeTx();
      tx.playerProgress.upsert = jest.fn().mockRejectedValue(new Error("DB error"));
      const repo = new PrismaProgressRepository(makeWritePrisma(tx));

      // Act / Assert
      await expect(repo.save(makeEmptyProgress())).rejects.toBeInstanceOf(InfrastructureError);
    });
  });
});
