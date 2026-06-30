import { jest } from '@jest/globals';
import { GetLeaderboardService } from '../../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { LeaderboardRepository } from '../../../src/application/leaderboard/ports/LeaderboardRepository.js';
import type { LevelRepository } from '../../../src/application/level-catalog/ports/LevelRepository.js';
import type { Level } from '../../../src/domain/level-catalog/Level.js';
import { NotFoundError } from '../../../src/shared/errors/ApplicationError.js';
import { Leaderboard } from '../../../src/domain/leaderboard/Leaderboard.js';
import { ScoreEntry } from '../../../src/domain/leaderboard/ScoreEntry.js';
import { EntryId } from '../../../src/domain/leaderboard/value-objects/EntryId.js';
import { LeaderboardId } from '../../../src/domain/leaderboard/value-objects/LeaderboardId.js';
import { MaxLeaderboardEntries } from '../../../src/domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { MoveCount } from '../../../src/domain/leaderboard/value-objects/MoveCount.js';
import { Score } from '../../../src/domain/leaderboard/value-objects/Score.js';
import { SubmittedAt } from '../../../src/domain/leaderboard/value-objects/SubmittedAt.js';
import { TimeSeconds } from '../../../src/domain/leaderboard/value-objects/TimeSeconds.js';
import { UsernameSnapshot } from '../../../src/domain/leaderboard/value-objects/UsernameSnapshot.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';
import { UserId } from '../../../src/domain/shared/UserId.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const LEVEL_99 = '550e8400-e29b-41d4-a716-446655440099';
const FIXED_NOW = new Date('2026-06-18T00:00:00Z');

function makeRepo(leaderboard: Leaderboard | null): jest.Mocked<LeaderboardRepository> {
  return {
    findByLevelId: jest.fn().mockResolvedValue(leaderboard),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function makeLevelRepo(level: Level | null = {} as Level): jest.Mocked<LevelRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(level),
    findAllPublished: jest.fn().mockResolvedValue([]),
  };
}

function makeLeaderboardWithEntry(): Leaderboard {
  const lb = Leaderboard.empty(
    new LeaderboardId('lb-1'),
    LevelId.create(LEVEL_1),
    new MaxLeaderboardEntries(10),
    FIXED_NOW,
  );
  lb.submitEntry(
    ScoreEntry.create({
      id: new EntryId('entry-1'),
      userId: UserId.create(USER_1),
      levelId: LevelId.create(LEVEL_1),
      usernameSnapshot: new UsernameSnapshot('Player1'),
      score: new Score(100),
      timeSeconds: new TimeSeconds(30),
      movesCount: new MoveCount(15),
      submittedAt: new SubmittedAt(FIXED_NOW),
    }),
    FIXED_NOW,
  );
  return lb;
}

describe('GetLeaderboardService', () => {
  describe('execute', () => {
    it('should_return_leaderboard_dto_when_leaderboard_exists', async () => {
      const leaderboard = makeLeaderboardWithEntry();
      const service = new GetLeaderboardService(makeRepo(leaderboard), makeLevelRepo());

      const result = await service.execute({ levelId: LEVEL_1 });

      expect(result.leaderboardId).toBe('lb-1');
      expect(result.levelId).toBe(LEVEL_1);
      expect(result.entries).toHaveLength(1);
    });

    it('should_return_entry_with_rank_when_leaderboard_has_entries', async () => {
      const leaderboard = makeLeaderboardWithEntry();
      const service = new GetLeaderboardService(makeRepo(leaderboard), makeLevelRepo());

      const result = await service.execute({ levelId: LEVEL_1 });

      expect(result.entries[0]?.rank).toBe(1);
      expect(result.entries[0]?.score).toBe(100);
    });

    it('should_return_empty_entries_when_known_level_has_no_leaderboard', async () => {
      const service = new GetLeaderboardService(makeRepo(null), makeLevelRepo({ id: LevelId.create(LEVEL_99) } as Level));

      const result = await service.execute({ levelId: LEVEL_99 });

      expect(result).toEqual({ levelId: LEVEL_99, entries: [] });
    });

    it('should_throw_not_found_when_level_does_not_exist', async () => {
      const service = new GetLeaderboardService(makeRepo(null), makeLevelRepo(null));

      await expect(service.execute({ levelId: LEVEL_99 })).rejects.toThrow(NotFoundError);
    });
  });
});
