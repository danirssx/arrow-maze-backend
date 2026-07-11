// Pattern: Repository, Adapter
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  DailyChallengeCacheRecord,
  DailyChallengeCacheRepository,
} from "../../application/daily-challenge/ports/DailyChallengeCacheRepository.js";
import type {
  DailyChallengeDto,
  DailyChallengeLevelDto,
  DailyChallengeSource,
} from "../../application/daily-challenge/DailyChallengeTypes.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";
import { getClient } from "../database/prismaContext.js";

type DailyChallengeRecord = {
  date: string;
  seed: string;
  targetDifficulty: string;
  source: string;
  level: unknown;
  validation: unknown;
  generatedAt: Date;
  expiresAt: Date;
};

type ValidationRecord = {
  solvable: true;
  difficultyMatched: true;
  fallbackUsed: boolean;
};

export class PrismaDailyChallengeCacheRepository implements DailyChallengeCacheRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByDate(date: string): Promise<DailyChallengeCacheRecord | null> {
    try {
      const record = await getClient(this.prisma).dailyChallenge.findUnique({ where: { date } });
      return record === null ? null : { challenge: recordToChallenge(record) };
    } catch (err) {
      throw new InfrastructureError("Failed to find daily challenge", { cause: String(err) });
    }
  }

  async save(record: DailyChallengeCacheRecord): Promise<void> {
    try {
      const now = new Date();
      const data = challengeToRecord(record.challenge);
      await getClient(this.prisma).dailyChallenge.upsert({
        where: { date: record.challenge.date },
        create: {
          ...data,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          ...data,
          updatedAt: now,
        },
      });
    } catch (err) {
      if (err instanceof InfrastructureError) throw err;
      throw new InfrastructureError("Failed to save daily challenge", { cause: String(err) });
    }
  }
}

function recordToChallenge(record: DailyChallengeRecord): DailyChallengeDto {
  if (!isDailyChallengeSource(record.source)) {
    throw new InfrastructureError("Corrupted DB value for daily challenge source");
  }
  if (!isLevelRecord(record.level)) {
    throw new InfrastructureError("Corrupted DB value for daily challenge level");
  }
  if (!isValidationRecord(record.validation)) {
    throw new InfrastructureError("Corrupted DB value for daily challenge validation");
  }

  return {
    date: record.date,
    seed: record.seed,
    targetDifficulty: record.targetDifficulty,
    source: record.source,
    generatedAt: record.generatedAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    validation: record.validation,
    level: record.level,
  };
}

function challengeToRecord(challenge: DailyChallengeDto) {
  return {
    date: challenge.date,
    seed: challenge.seed,
    targetDifficulty: challenge.targetDifficulty,
    source: challenge.source,
    generatedAt: new Date(challenge.generatedAt),
    expiresAt: new Date(challenge.expiresAt),
    level: challenge.level as unknown as Prisma.InputJsonValue,
    validation: challenge.validation as unknown as Prisma.InputJsonValue,
  };
}

function isDailyChallengeSource(value: string): value is DailyChallengeSource {
  return value === "gemini" || value === "fallback";
}

function isLevelRecord(value: unknown): value is DailyChallengeLevelDto {
  return typeof value === "object" && value !== null;
}

function isValidationRecord(value: unknown): value is ValidationRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record["solvable"] === true &&
    record["difficultyMatched"] === true &&
    typeof record["fallbackUsed"] === "boolean"
  );
}
