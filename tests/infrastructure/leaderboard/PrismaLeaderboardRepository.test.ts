import { jest } from "@jest/globals";
import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaLeaderboardRepository } from "../../../src/infrastructure/leaderboard/PrismaLeaderboardRepository.js";
import { Leaderboard } from "../../../src/domain/leaderboard/Leaderboard.js";
import { ScoreEntry } from "../../../src/domain/leaderboard/ScoreEntry.js";
import { EntryId } from "../../../src/domain/leaderboard/value-objects/EntryId.js";
import { LeaderboardId } from "../../../src/domain/leaderboard/value-objects/LeaderboardId.js";
import { MaxLeaderboardEntries } from "../../../src/domain/leaderboard/value-objects/MaxLeaderboardEntries.js";
import { MoveCount } from "../../../src/domain/leaderboard/value-objects/MoveCount.js";
import { Rank } from "../../../src/domain/leaderboard/value-objects/Rank.js";
import { Score } from "../../../src/domain/leaderboard/value-objects/Score.js";
import { SubmittedAt } from "../../../src/domain/leaderboard/value-objects/SubmittedAt.js";
import { TimeSeconds } from "../../../src/domain/leaderboard/value-objects/TimeSeconds.js";
import { UpdatedAt } from "../../../src/domain/leaderboard/value-objects/UpdatedAt.js";
import { UsernameSnapshot } from "../../../src/domain/leaderboard/value-objects/UsernameSnapshot.js";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError.js";
import { LevelId } from "../../../src/domain/shared/LevelId.js";
import { UserId } from "../../../src/domain/shared/UserId.js";

// Subject to human review — infrastructure adapter test

const LEVEL_1 = "550e8400-e29b-41d4-a716-446655440010";
const LB_1 = "550e8400-e29b-41d4-a716-446655440020";
const USER_1 = "550e8400-e29b-41d4-a716-446655440001";
const ENTRY_1 = "550e8400-e29b-41d4-a716-446655440030";
const ENTRY_2 = "550e8400-e29b-41d4-a716-446655440031";

type LeaderboardDelegate = { findUnique: jest.Mock };
type TxDelegates = {
  leaderboard: { upsert: jest.Mock };
  leaderboardEntry: { deleteMany: jest.Mock; createMany: jest.Mock };
};

function makeReadPrisma(findUnique: jest.Mock): PrismaClient {
  return { leaderboard: { findUnique } as LeaderboardDelegate } as unknown as PrismaClient;
}

function makeTx(): TxDelegates {
  return {
    leaderboard: { upsert: jest.fn().mockResolvedValue(undefined) },
    leaderboardEntry: {
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

function makeEmptyLeaderboard(): Leaderboard {
  return Leaderboard.empty(LeaderboardId.create(LB_1), LevelId.create(LEVEL_1), new MaxLeaderboardEntries(10));
}

function makeLeaderboardWithEntry(): Leaderboard {
  const entry = ScoreEntry.create({
    id: EntryId.create(ENTRY_1),
    userId: UserId.create(USER_1),
    levelId: LevelId.create(LEVEL_1),
    usernameSnapshot: new UsernameSnapshot("player_one"),
    score: new Score(980),
    timeSeconds: new TimeSeconds(18),
    movesCount: new MoveCount(4),
    submittedAt: new SubmittedAt(new Date("2026-01-01T00:00:00Z")),
  }).withRank(new Rank(1));

  return Leaderboard.create({
    id: LeaderboardId.create(LB_1),
    levelId: LevelId.create(LEVEL_1),
    maxEntries: new MaxLeaderboardEntries(10),
    updatedAt: new UpdatedAt(new Date("2026-01-01T00:00:00Z")),
    entries: [entry],
  });
}

function makeLeaderboardAfterReplacement(): Leaderboard {
  // Same user submits twice (better the second time). The aggregate keeps one
  // entry per user, so the repository must persist exactly one row for that user
  // — honoring @@unique([leaderboardId, userId]).
  const board = Leaderboard.empty(LeaderboardId.create(LB_1), LevelId.create(LEVEL_1), new MaxLeaderboardEntries(10));
  board.submitEntry(
    ScoreEntry.create({
      id: EntryId.create(ENTRY_1),
      userId: UserId.create(USER_1),
      levelId: LevelId.create(LEVEL_1),
      usernameSnapshot: new UsernameSnapshot("player_one"),
      score: new Score(900),
      timeSeconds: new TimeSeconds(30),
      movesCount: new MoveCount(8),
      submittedAt: new SubmittedAt(new Date("2026-01-01T00:00:00Z")),
    }),
  );
  board.submitEntry(
    ScoreEntry.create({
      id: EntryId.create(ENTRY_2),
      userId: UserId.create(USER_1),
      levelId: LevelId.create(LEVEL_1),
      usernameSnapshot: new UsernameSnapshot("player_one"),
      score: new Score(990),
      timeSeconds: new TimeSeconds(20),
      movesCount: new MoveCount(5),
      submittedAt: new SubmittedAt(new Date("2026-01-02T00:00:00Z")),
    }),
  );
  return board;
}

describe("PrismaLeaderboardRepository", () => {
  describe("findByLevelId", () => {
    it("should_return_null_when_no_leaderboard_found", async () => {
      // Arrange
      const repo = new PrismaLeaderboardRepository(makeReadPrisma(jest.fn().mockResolvedValue(null)));

      // Act
      const result = await repo.findByLevelId(LevelId.create(LEVEL_1));

      // Assert
      expect(result).toBeNull();
    });

    it("should_rehydrate_leaderboard_with_entries_when_found", async () => {
      // Arrange
      const findUnique = jest.fn().mockResolvedValue({
        id: LB_1,
        levelId: LEVEL_1,
        maxEntries: 10,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        entries: [
          {
            id: ENTRY_1,
            userId: USER_1,
            levelId: LEVEL_1,
            usernameSnapshot: "player_one",
            score: 980,
            timeSeconds: new Prisma.Decimal(18),
            movesCount: 4,
            rank: 1,
            submittedAt: new Date("2026-01-01T00:00:00Z"),
          },
        ],
      });
      const repo = new PrismaLeaderboardRepository(makeReadPrisma(findUnique));

      // Act
      const result = await repo.findByLevelId(LevelId.create(LEVEL_1));

      // Assert
      expect(result?.id.value).toBe(LB_1);
      expect(result?.entries).toHaveLength(1);
      expect(result?.entries[0]?.score.value).toBe(980);
      expect(result?.entries[0]?.timeSeconds.value).toBe(18);
      // Entries are requested ordered by rank, NULLS LAST.
      expect(findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { levelId: LEVEL_1 },
          include: { entries: { orderBy: { rank: { sort: "asc", nulls: "last" } } } },
        })
      );
    });

    it("should_throw_infrastructure_error_when_query_fails", async () => {
      // Arrange
      const repo = new PrismaLeaderboardRepository(makeReadPrisma(jest.fn().mockRejectedValue(new Error("DB down"))));

      // Act / Assert
      await expect(repo.findByLevelId(LevelId.create(LEVEL_1))).rejects.toBeInstanceOf(InfrastructureError);
    });
  });

  describe("save", () => {
    it("should_upsert_board_and_clear_entries_within_a_transaction", async () => {
      // Arrange
      const tx = makeTx();
      const repo = new PrismaLeaderboardRepository(makeWritePrisma(tx));

      // Act
      await repo.save(makeEmptyLeaderboard());

      // Assert
      expect(tx.leaderboard.upsert).toHaveBeenCalledTimes(1);
      expect(tx.leaderboardEntry.deleteMany).toHaveBeenCalledWith({ where: { leaderboardId: LB_1 } });
      expect(tx.leaderboardEntry.createMany).not.toHaveBeenCalled();
    });

    it("should_create_entries_when_leaderboard_has_entries", async () => {
      // Arrange
      const tx = makeTx();
      const repo = new PrismaLeaderboardRepository(makeWritePrisma(tx));

      // Act
      await repo.save(makeLeaderboardWithEntry());

      // Assert
      expect(tx.leaderboardEntry.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ id: ENTRY_1, leaderboardId: LB_1, rank: 1 })]),
        })
      );
    });

    it("should_persist_a_single_row_per_user_when_entry_replaced", async () => {
      // Arrange
      const tx = makeTx();
      const repo = new PrismaLeaderboardRepository(makeWritePrisma(tx));

      // Act
      await repo.save(makeLeaderboardAfterReplacement());

      // Assert — deleteMany clears the user's old row, createMany writes exactly one
      // (the better score), so @@unique([leaderboardId, userId]) is never violated.
      const createArg = tx.leaderboardEntry.createMany.mock.calls[0]?.[0] as {
        data: Array<{ userId: string; score: number }>;
      };
      const userRows = createArg.data.filter((row) => row.userId === USER_1);
      expect(userRows).toHaveLength(1);
      expect(userRows[0]?.score).toBe(990);
      expect(tx.leaderboardEntry.deleteMany).toHaveBeenCalledWith({ where: { leaderboardId: LB_1 } });
    });

    it("should_throw_infrastructure_error_when_save_fails", async () => {
      // Arrange
      const tx = makeTx();
      tx.leaderboard.upsert = jest.fn().mockRejectedValue(new Error("DB error"));
      const repo = new PrismaLeaderboardRepository(makeWritePrisma(tx));

      // Act / Assert
      await expect(repo.save(makeEmptyLeaderboard())).rejects.toBeInstanceOf(InfrastructureError);
    });
  });
});
