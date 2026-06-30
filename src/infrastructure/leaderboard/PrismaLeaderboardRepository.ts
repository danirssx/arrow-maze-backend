// Pattern: Repository, Adapter
import type { Prisma, PrismaClient } from '@prisma/client';
import type { LeaderboardRepository } from '../../application/leaderboard/ports/LeaderboardRepository.js';
import { Leaderboard } from '../../domain/leaderboard/Leaderboard.js';
import { ScoreEntry } from '../../domain/leaderboard/ScoreEntry.js';
import { EntryId } from '../../domain/leaderboard/value-objects/EntryId.js';
import { LeaderboardId } from '../../domain/leaderboard/value-objects/LeaderboardId.js';
import { MaxLeaderboardEntries } from '../../domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { MoveCount } from '../../domain/leaderboard/value-objects/MoveCount.js';
import { Rank } from '../../domain/leaderboard/value-objects/Rank.js';
import { Score } from '../../domain/leaderboard/value-objects/Score.js';
import { SubmittedAt } from '../../domain/leaderboard/value-objects/SubmittedAt.js';
import { TimeSeconds } from '../../domain/leaderboard/value-objects/TimeSeconds.js';
import { UpdatedAt } from '../../domain/leaderboard/value-objects/UpdatedAt.js';
import { UsernameSnapshot } from '../../domain/leaderboard/value-objects/UsernameSnapshot.js';
import { LevelId } from '../../domain/shared/LevelId.js';
import { UserId } from '../../domain/shared/UserId.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { getClient, withTransaction } from '../database/prismaContext.js';

type EntryRecord = {
  id: string;
  userId: string;
  levelId: string;
  usernameSnapshot: string;
  score: number;
  timeSeconds: Prisma.Decimal;
  movesCount: number;
  rank: number | null;
  submittedAt: Date;
};

function recordToEntry(record: EntryRecord): ScoreEntry {
  const entry = ScoreEntry.create({
    id: EntryId.create(record.id),
    userId: UserId.create(record.userId),
    levelId: LevelId.create(record.levelId),
    usernameSnapshot: new UsernameSnapshot(record.usernameSnapshot),
    score: new Score(record.score),
    timeSeconds: new TimeSeconds(record.timeSeconds.toNumber()),
    movesCount: new MoveCount(record.movesCount),
    submittedAt: new SubmittedAt(record.submittedAt),
  });
  return record.rank !== null ? entry.withRank(new Rank(record.rank)) : entry;
}

export class PrismaLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByLevelId(levelId: LevelId): Promise<Leaderboard | null> {
    try {
      const client = getClient(this.prisma);
      const board = await client.leaderboard.findUnique({
        where: { levelId: levelId.value },
        include: { entries: { orderBy: { rank: { sort: 'asc', nulls: 'last' } } } },
      });

      if (!board) return null;

      return Leaderboard.create({
        id: LeaderboardId.create(board.id),
        levelId: LevelId.create(board.levelId),
        maxEntries: new MaxLeaderboardEntries(board.maxEntries),
        updatedAt: new UpdatedAt(board.updatedAt),
        entries: board.entries.map(recordToEntry),
      });
    } catch (err) {
      if (err instanceof DomainError) throw err;
      throw new InfrastructureError('Failed to find leaderboard', { cause: String(err) });
    }
  }

  async save(leaderboard: Leaderboard): Promise<void> {
    try {
      await withTransaction(this.prisma, async (tx) => {
        await tx.leaderboard.upsert({
          where: { id: leaderboard.id.value },
          create: {
            id: leaderboard.id.value,
            levelId: leaderboard.levelId.value,
            maxEntries: leaderboard.maxEntries.value,
            updatedAt: leaderboard.updatedAt.value,
          },
          update: {
            maxEntries: leaderboard.maxEntries.value,
            updatedAt: leaderboard.updatedAt.value,
          },
        });

        await tx.leaderboardEntry.deleteMany({ where: { leaderboardId: leaderboard.id.value } });

        if (leaderboard.entries.length > 0) {
          await tx.leaderboardEntry.createMany({
            data: leaderboard.entries.map((entry) => ({
              id: entry.id.value,
              leaderboardId: leaderboard.id.value,
              userId: entry.userId.value,
              levelId: entry.levelId.value,
              usernameSnapshot: entry.usernameSnapshot.value,
              score: entry.score.value,
              timeSeconds: entry.timeSeconds.value,
              movesCount: entry.movesCount.value,
              rank: entry.rank?.value ?? null,
              submittedAt: entry.submittedAt.value,
            })),
          });
        }
      });
    } catch (err) {
      if (err instanceof InfrastructureError) throw err;
      throw new InfrastructureError('Failed to save leaderboard', { cause: String(err) });
    }
  }
}
