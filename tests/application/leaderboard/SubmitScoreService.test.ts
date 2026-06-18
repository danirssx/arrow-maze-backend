import { jest } from '@jest/globals';
import { SubmitScoreService, type SubmitScoreInput } from '../../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import { RankingService } from '../../../src/application/leaderboard/services/RankingService.js';
import { ScoreValidationService } from '../../../src/application/leaderboard/services/ScoreValidationService.js';
import type { ILeaderboardRepository } from '../../../src/application/leaderboard/ports/ILeaderboardRepository.js';
import type { IDomainEventBus } from '../../../src/application/leaderboard/ports/IDomainEventBus.js';
import { ValidationError } from '../../../src/shared/errors/ApplicationError.js';
import { Leaderboard } from '../../../src/domain/leaderboard/Leaderboard.js';
import { LeaderboardId } from '../../../src/domain/leaderboard/value-objects/LeaderboardId.js';
import { LevelId } from '../../../src/domain/leaderboard/value-objects/LevelId.js';
import { MaxLeaderboardEntries } from '../../../src/domain/leaderboard/value-objects/MaxLeaderboardEntries.js';

function makeInput(overrides?: Partial<SubmitScoreInput>): SubmitScoreInput {
  return {
    leaderboardId: 'lb-1',
    entryId: 'entry-1',
    userId: 'user-1',
    levelId: 'level-1',
    usernameSnapshot: 'Player1',
    score: 100,
    timeSeconds: 30,
    movesCount: 15,
    ...overrides,
  };
}

function makeRepo(leaderboard: Leaderboard | null = null): jest.Mocked<ILeaderboardRepository> {
  return {
    findByLevelId: jest.fn().mockResolvedValue(leaderboard),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function makeEventBus(): jest.Mocked<IDomainEventBus> {
  return { publishAll: jest.fn().mockResolvedValue(undefined) };
}

function makeService(repo: ILeaderboardRepository) {
  return new SubmitScoreService(repo, new RankingService(), new ScoreValidationService(), makeEventBus());
}

describe('SubmitScoreService', () => {
  describe('execute', () => {
    it('should_save_leaderboard_when_valid_score_submitted', async () => {
      // Arrange
      const repo = makeRepo();
      const service = makeService(repo);

      // Act
      await service.execute(makeInput());

      // Assert
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('should_create_empty_leaderboard_when_none_exists_for_level', async () => {
      // Arrange
      const repo = makeRepo(null);
      const service = makeService(repo);

      // Act
      await service.execute(makeInput());

      // Assert
      const saved = (repo.save as jest.Mock).mock.calls[0][0] as Leaderboard;
      expect(saved.entries).toHaveLength(1);
    });

    it('should_add_entry_to_existing_leaderboard_when_leaderboard_exists', async () => {
      // Arrange
      const existing = Leaderboard.empty(
        new LeaderboardId('lb-1'),
        new LevelId('level-1'),
        new MaxLeaderboardEntries(10),
      );
      const repo = makeRepo(existing);
      const service = makeService(repo);

      // Act
      await service.execute(makeInput());

      // Assert
      expect(existing.entries).toHaveLength(1);
    });

    it('should_publish_domain_events_when_entry_submitted', async () => {
      // Arrange
      const eventBus = makeEventBus();
      const repo = makeRepo();
      const service = new SubmitScoreService(repo, new RankingService(), new ScoreValidationService(), eventBus);

      // Act
      await service.execute(makeInput());

      // Assert
      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    });

    it('should_throw_validation_error_when_score_is_negative', async () => {
      // Arrange
      const service = makeService(makeRepo());

      // Act & Assert
      await expect(service.execute(makeInput({ score: -1 }))).rejects.toThrow(ValidationError);
    });

    it('should_throw_validation_error_when_time_seconds_is_zero', async () => {
      // Arrange
      const service = makeService(makeRepo());

      // Act & Assert
      await expect(service.execute(makeInput({ timeSeconds: 0 }))).rejects.toThrow(ValidationError);
    });
  });
});
