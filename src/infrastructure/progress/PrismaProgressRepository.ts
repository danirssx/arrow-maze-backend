// Pattern: Repository, Adapter
import type { Prisma, PrismaClient } from '@prisma/client';
import type { ProgressRepository } from '../../application/progress/ports/IProgressRepository.js';
import { CompletedLevel } from '../../domain/progress/CompletedLevel.js';
import { PlayerProgress } from '../../domain/progress/PlayerProgress.js';
import { CompletedAt } from '../../domain/progress/value-objects/CompletedAt.js';
import { CompletedLevelId } from '../../domain/progress/value-objects/CompletedLevelId.js';
import { LevelScore } from '../../domain/progress/value-objects/LevelScore.js';
import { ProgressId } from '../../domain/progress/value-objects/ProgressId.js';
import { ProgressVersion } from '../../domain/progress/value-objects/ProgressVersion.js';
import { UpdatedAt } from '../../domain/progress/value-objects/UpdatedAt.js';
import { LevelId } from '../../domain/shared/LevelId.js';
import { UserId } from '../../domain/shared/UserId.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { getClient, withTransaction } from '../database/prismaContext.js';

type CompletedLevelRecord = {
  id: string;
  levelId: string;
  bestScore: number;
  bestTimeSeconds: Prisma.Decimal;
  bestMovesCount: number;
  completedAt: Date;
  updatedAt: Date;
};

type ProgressRecord = {
  id: string;
  userId: string;
  version: number;
  updatedAt: Date;
  completedLevels: CompletedLevelRecord[];
};

function recordToCompletedLevel(record: CompletedLevelRecord): CompletedLevel {
  return CompletedLevel.create({
    id: CompletedLevelId.create(record.id),
    levelId: LevelId.create(record.levelId),
    bestScore: new LevelScore(record.bestScore, record.bestTimeSeconds.toNumber(), record.bestMovesCount),
    completedAt: new CompletedAt(record.completedAt),
    updatedAt: new UpdatedAt(record.updatedAt),
  });
}

function recordToProgress(record: ProgressRecord): PlayerProgress {
  return PlayerProgress.create({
    id: ProgressId.create(record.id),
    userId: UserId.create(record.userId),
    version: new ProgressVersion(record.version),
    updatedAt: new UpdatedAt(record.updatedAt),
    completedLevels: record.completedLevels.map(recordToCompletedLevel),
  });
}

export class PrismaProgressRepository implements ProgressRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: UserId): Promise<PlayerProgress | null> {
    try {
      const record = await getClient(this.prisma).playerProgress.findUnique({
        where: { userId: userId.value },
        include: { completedLevels: true },
      });

      return record ? recordToProgress(record) : null;
    } catch (err) {
      throw new InfrastructureError('Failed to find player progress', { cause: String(err) });
    }
  }

  async save(progress: PlayerProgress): Promise<void> {
    try {
      await withTransaction(this.prisma, async (tx) => {
        await tx.playerProgress.upsert({
          where: { id: progress.id.value },
          create: {
            id: progress.id.value,
            userId: progress.userId.value,
            version: progress.version.value,
            updatedAt: progress.updatedAt.value,
          },
          update: {
            version: progress.version.value,
            updatedAt: progress.updatedAt.value,
          },
        });

        await tx.completedLevel.deleteMany({ where: { progressId: progress.id.value } });

        if (progress.completedLevels.length > 0) {
          await tx.completedLevel.createMany({
            data: progress.completedLevels.map((level) => ({
              id: level.id.value,
              progressId: progress.id.value,
              levelId: level.levelId.value,
              bestScore: level.bestScore.score,
              bestTimeSeconds: level.bestScore.timeSeconds,
              bestMovesCount: level.bestScore.movesCount,
              completedAt: level.completedAt.value,
              updatedAt: level.updatedAt.value,
            })),
          });
        }
      });
    } catch (err) {
      if (err instanceof InfrastructureError) throw err;
      throw new InfrastructureError('Failed to save player progress', { cause: String(err) });
    }
  }
}
