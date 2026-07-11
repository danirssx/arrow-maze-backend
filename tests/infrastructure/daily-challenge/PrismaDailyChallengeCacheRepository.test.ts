import { jest } from "@jest/globals";
import type { PrismaClient } from "@prisma/client";
import { PrismaDailyChallengeCacheRepository } from "../../../src/infrastructure/daily-challenge/PrismaDailyChallengeCacheRepository.js";
import type { DailyChallengeDto } from "../../../src/application/daily-challenge/use-cases/GetDailyChallengeUseCase.js";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError.js";

// Subject to human review — infrastructure adapter test for MAZ-218 daily cache.

type DailyChallengeDelegate = {
  findUnique: jest.Mock;
  upsert: jest.Mock;
};

function makeChallenge(overrides: Partial<DailyChallengeDto> = {}): DailyChallengeDto {
  return {
    date: "2026-07-10",
    seed: "daily-2026-07-10",
    targetDifficulty: "MEDIUM",
    source: "gemini",
    generatedAt: "2026-07-10T04:00:00.000Z",
    expiresAt: "2026-07-11T00:00:00.000Z",
    validation: {
      solvable: true,
      difficultyMatched: true,
      fallbackUsed: false,
    },
    level: {
      name: "Daily Challenge 2026-07-10",
      description: "A generated daily puzzle.",
      difficulty: "MEDIUM",
      definition: {
        attempts: 5,
        arrows: [
          {
            id: "arrow-0",
            color: "#4B6BFB",
            path: [{ row: 0, col: 0 }],
            direction: "RIGHT",
          },
        ],
      },
    },
    ...overrides,
  };
}

function makeRecord(challenge = makeChallenge()) {
  return {
    date: challenge.date,
    seed: challenge.seed,
    targetDifficulty: challenge.targetDifficulty,
    source: challenge.source,
    generatedAt: new Date(challenge.generatedAt),
    expiresAt: new Date(challenge.expiresAt),
    level: challenge.level,
    validation: challenge.validation,
    createdAt: new Date("2026-07-10T04:00:00.000Z"),
    updatedAt: new Date("2026-07-10T04:00:00.000Z"),
  };
}

function makePrisma(overrides: Partial<DailyChallengeDelegate> = {}) {
  const dailyChallenge: DailyChallengeDelegate = {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return {
    prisma: { dailyChallenge } as unknown as PrismaClient,
    dailyChallenge,
  };
}

describe("PrismaDailyChallengeCacheRepository", () => {
  it("should_return_cached_challenge_when_record_exists", async () => {
    // Arrange
    const challenge = makeChallenge();
    const { prisma } = makePrisma({ findUnique: jest.fn().mockResolvedValue(makeRecord(challenge)) });
    const repo = new PrismaDailyChallengeCacheRepository(prisma);

    // Act
    const result = await repo.findByDate("2026-07-10");

    // Assert
    expect(result?.challenge).toEqual(challenge);
  });

  it("should_return_null_when_record_does_not_exist", async () => {
    // Arrange
    const { prisma } = makePrisma();
    const repo = new PrismaDailyChallengeCacheRepository(prisma);

    // Act / Assert
    await expect(repo.findByDate("2026-07-10")).resolves.toBeNull();
  });

  it("should_upsert_challenge_by_utc_date", async () => {
    // Arrange
    const challenge = makeChallenge({ source: "fallback" });
    const { prisma, dailyChallenge } = makePrisma();
    const repo = new PrismaDailyChallengeCacheRepository(prisma);

    // Act
    await repo.save({ challenge });

    // Assert
    expect(dailyChallenge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: "2026-07-10" },
        create: expect.objectContaining({
          date: "2026-07-10",
          seed: "daily-2026-07-10",
          source: "fallback",
          generatedAt: new Date("2026-07-10T04:00:00.000Z"),
          expiresAt: new Date("2026-07-11T00:00:00.000Z"),
          level: challenge.level,
          validation: challenge.validation,
        }),
      })
    );
  });

  it("should_throw_infrastructure_error_when_cache_read_fails", async () => {
    // Arrange
    const { prisma } = makePrisma({ findUnique: jest.fn().mockRejectedValue(new Error("db down")) });
    const repo = new PrismaDailyChallengeCacheRepository(prisma);

    // Act / Assert
    await expect(repo.findByDate("2026-07-10")).rejects.toBeInstanceOf(InfrastructureError);
  });

  it("should_throw_infrastructure_error_when_cache_write_fails", async () => {
    // Arrange
    const { prisma } = makePrisma({ upsert: jest.fn().mockRejectedValue(new Error("db down")) });
    const repo = new PrismaDailyChallengeCacheRepository(prisma);

    // Act / Assert
    await expect(repo.save({ challenge: makeChallenge() })).rejects.toBeInstanceOf(
      InfrastructureError
    );
  });
});
