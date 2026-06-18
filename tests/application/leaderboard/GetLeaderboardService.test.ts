import { jest } from '@jest/globals';
import { GetLeaderboardService } from '../../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { ILeaderboardRepository } from '../../../src/application/leaderboard/ports/ILeaderboardRepository.js';
import { NotFoundError } from '../../../src/shared/errors/ApplicationError.js';
import { Leaderboard } from '../../../src/domain/leaderboard/Leaderboard.js';
import { ScoreEntry } from '../../../src/domain/leaderboard/ScoreEntry.js';
import { EntryId } from '../../../src/domain/leaderboard/value-objects/EntryId.js';
import { LeaderboardId } from '../../../src/domain/leaderboard/value-objects/LeaderboardId.js';
import { LevelId } from '../../../src/domain/leaderboard/value-objects/LevelId.js';
import { MaxLeaderboardEntries } from '../../../src/domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { MoveCount } from '../../../src/domain/leaderboard/value-objects/MoveCount.js';
import { Score } from '../../../src/domain/leaderboard/value-objects/Score.js';
import { SubmittedAt } from '../../../src/domain/leaderboard/value-objects/SubmittedAt.js';
import { TimeSeconds } from '../../../src/domain/leaderboard/value-objects/TimeSeconds.js';
import { UserId } from '../../../src/domain/leaderboard/value-objects/UserId.js';
import { UsernameSnapshot } from '../../../src/domain/leaderboard/value-objects/UsernameSnapshot.js';

function makeRepo(leaderboard: Leaderboard | null): jest.Mocked<ILeaderboardRepository> {
  return {
    findByLevelId: jest.fn().mockResolvedValue(leaderboard),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function makeLeaderboardWithEntry(): Leaderboard {
  const lb = Leaderboard.empty(
    new LeaderboardId('lb-1'),
    new LevelId('level-1'),
    new MaxLeaderboardEntries(10),
  );
  lb.submitEntry(
    ScoreEntry.create({
      id: new EntryId('entry-1'),
      userId: new UserId('user-1'),
      levelId: new LevelId('level-1'),
      usernameSnapshot: new UsernameSnapshot('Player1'),
      score: new Score(100),
      timeSeconds: new TimeSeconds(30),
      movesCount: new MoveCount(15),
      submittedAt: SubmittedAt.now(),
    }),
  );
  return lb;
}

describe('GetLeaderboardService', () => {
  describe('execute', () => {
    it('should_return_leaderboard_dto_when_leaderboard_exists', async () => {
      // Arrange
      const leaderboard = makeLeaderboardWithEntry();
      const service = new GetLeaderboardService(makeRepo(leaderboard));

      // Act
      const result = await service.execute({ levelId: 'level-1' });

      // Assert
      expect(result.leaderboardId).toBe('lb-1');
      expect(result.levelId).toBe('level-1');
      expect(result.entries).toHaveLength(1);
    });

    it('should_return_entry_with_rank_when_leaderboard_has_entries', async () => {
      // Arrange
      const leaderboard = makeLeaderboardWithEntry();
      const service = new GetLeaderboardService(makeRepo(leaderboard));

      // Act
      const result = await service.execute({ levelId: 'level-1' });

      // Assert
      expect(result.entries[0]?.rank).toBe(1);
      expect(result.entries[0]?.score).toBe(100);
    });

    it('should_throw_not_found_when_leaderboard_does_not_exist', async () => {
      // Arrange
      const service = new GetLeaderboardService(makeRepo(null));

      // Act & Assert
      await expect(service.execute({ levelId: 'level-99' })).rejects.toThrow(NotFoundError);
    });
  });
});
