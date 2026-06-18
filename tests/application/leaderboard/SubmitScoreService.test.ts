import { jest } from '@jest/globals';
import { SubmitScoreService, type SubmitScoreInput } from '../../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import type { LeaderboardRepository } from '../../../src/application/leaderboard/ports/ILeaderboardRepository.js';
import type { DomainEventBus } from '../../../src/application/ports/DomainEventBus.js';
import { ValidationError } from '../../../src/shared/errors/ApplicationError.js';
import { Leaderboard } from '../../../src/domain/leaderboard/Leaderboard.js';
import { LeaderboardId } from '../../../src/domain/leaderboard/value-objects/LeaderboardId.js';
import { MaxLeaderboardEntries } from '../../../src/domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';

function makeInput(overrides?: Partial<SubmitScoreInput>): SubmitScoreInput {
  return {
    leaderboardId: 'lb-1',
    entryId: 'entry-1',
    userId: USER_1,
    levelId: LEVEL_1,
    usernameSnapshot: 'Player1',
    score: 100,
    timeSeconds: 30,
    movesCount: 15,
    ...overrides,
  };
}

function makeRepo(leaderboard: Leaderboard | null = null): jest.Mocked<LeaderboardRepository> {
  return {
    findByLevelId: jest.fn().mockResolvedValue(leaderboard),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function makeEventBus(): jest.Mocked<DomainEventBus> {
  return { publishAll: jest.fn().mockResolvedValue(undefined) };
}

function makeService(repo: LeaderboardRepository) {
  return new SubmitScoreService(repo, makeEventBus());
}

describe('SubmitScoreService', () => {
  describe('execute', () => {
    it('should_save_leaderboard_when_valid_score_submitted', async () => {
      const repo = makeRepo();
      const service = makeService(repo);

      await service.execute(makeInput());

      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('should_create_empty_leaderboard_when_none_exists_for_level', async () => {
      const repo = makeRepo(null);
      const service = makeService(repo);

      await service.execute(makeInput());

      const saved = (repo.save as jest.Mock).mock.calls[0][0] as Leaderboard;
      expect(saved.entries).toHaveLength(1);
    });

    it('should_add_entry_to_existing_leaderboard_when_leaderboard_exists', async () => {
      const existing = Leaderboard.empty(
        new LeaderboardId('lb-1'),
        LevelId.create(LEVEL_1),
        new MaxLeaderboardEntries(10),
      );
      const repo = makeRepo(existing);
      const service = makeService(repo);

      await service.execute(makeInput());

      expect(existing.entries).toHaveLength(1);
    });

    it('should_publish_domain_events_when_entry_submitted', async () => {
      const eventBus = makeEventBus();
      const repo = makeRepo();
      const service = new SubmitScoreService(repo, eventBus);

      await service.execute(makeInput());

      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    });

    it('should_throw_validation_error_when_score_is_negative', async () => {
      const service = makeService(makeRepo());

      await expect(service.execute(makeInput({ score: -1 }))).rejects.toThrow(ValidationError);
    });

    it('should_throw_validation_error_when_time_seconds_is_zero', async () => {
      const service = makeService(makeRepo());

      await expect(service.execute(makeInput({ timeSeconds: 0 }))).rejects.toThrow(ValidationError);
    });
  });
});
