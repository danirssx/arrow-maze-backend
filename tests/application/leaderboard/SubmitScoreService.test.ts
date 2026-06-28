import { jest } from '@jest/globals';
import { SubmitScoreService, type SubmitScoreInput } from '../../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import type { LeaderboardRepository } from '../../../src/application/leaderboard/ports/ILeaderboardRepository.js';
import type { DomainEventBus } from '../../../src/application/ports/DomainEventBus.js';
import { InvalidArgumentError } from '../../../src/domain/errors/DomainError.js';
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
const LB_1 = '550e8400-e29b-41d4-a716-446655440020';
const ENTRY_1 = '550e8400-e29b-41d4-a716-446655440030';
const SEED_ENTRY = '550e8400-e29b-41d4-a716-446655440099';

function makeExistingLeaderboard(score: number, timeSeconds = 30): Leaderboard {
  const board = Leaderboard.empty(
    LeaderboardId.create(LB_1),
    LevelId.create(LEVEL_1),
    new MaxLeaderboardEntries(10),
  );
  board.submitEntry(
    ScoreEntry.create({
      id: EntryId.create(SEED_ENTRY),
      userId: UserId.create(USER_1),
      levelId: LevelId.create(LEVEL_1),
      usernameSnapshot: new UsernameSnapshot('Player1'),
      score: new Score(score),
      timeSeconds: new TimeSeconds(timeSeconds),
      movesCount: new MoveCount(15),
      submittedAt: SubmittedAt.now(),
    }),
  );
  board.clearEvents();
  return board;
}

function makeInput(overrides?: Partial<SubmitScoreInput>): SubmitScoreInput {
  return {
    leaderboardId: LB_1,
    entryId: ENTRY_1,
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
        LeaderboardId.create(LB_1),
        LevelId.create(LEVEL_1),
        new MaxLeaderboardEntries(10),
      );
      const repo = makeRepo(existing);
      const service = makeService(repo);

      await service.execute(makeInput());

      expect(existing.entries).toHaveLength(1);
    });

    it('should_save_updated_entry_when_better_score_resubmitted', async () => {
      const repo = makeRepo(makeExistingLeaderboard(100));
      const service = makeService(repo);

      await service.execute(makeInput({ score: 200 }));

      const saved = (repo.save as jest.Mock).mock.calls[0]?.[0] as Leaderboard;
      const userEntry = saved.entries.find((e) => e.userId.value === USER_1);
      expect(userEntry?.score.value).toBe(200);
      expect(saved.entries).toHaveLength(1);
    });

    it('should_save_without_throwing_when_worse_score_resubmitted', async () => {
      const repo = makeRepo(makeExistingLeaderboard(200));
      const service = makeService(repo);

      await expect(service.execute(makeInput({ score: 100 }))).resolves.toBeUndefined();

      const saved = (repo.save as jest.Mock).mock.calls[0]?.[0] as Leaderboard;
      const userEntry = saved.entries.find((e) => e.userId.value === USER_1);
      expect(userEntry?.score.value).toBe(200);
    });

    it('should_publish_domain_events_when_entry_submitted', async () => {
      const eventBus = makeEventBus();
      const repo = makeRepo();
      const service = new SubmitScoreService(repo, eventBus);

      await service.execute(makeInput());

      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    });

    it('should_throw_invalid_argument_error_when_score_is_negative', async () => {
      const service = makeService(makeRepo());

      await expect(service.execute(makeInput({ score: -1 }))).rejects.toThrow(InvalidArgumentError);
    });

    it('should_throw_invalid_argument_error_when_time_seconds_is_zero', async () => {
      const service = makeService(makeRepo());

      await expect(service.execute(makeInput({ timeSeconds: 0 }))).rejects.toThrow(InvalidArgumentError);
    });

    it('should_throw_invalid_argument_error_when_moves_count_is_zero', async () => {
      const service = makeService(makeRepo());

      await expect(service.execute(makeInput({ movesCount: 0 }))).rejects.toThrow(InvalidArgumentError);
    });
  });
});
