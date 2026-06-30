import { jest } from '@jest/globals';
import { SubmitScoreService, type SubmitScoreInput } from '../../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import type { LeaderboardRepository } from '../../../src/application/leaderboard/ports/ILeaderboardRepository.js';
import type { UserRepository } from '../../../src/application/identity/ports/UserRepository.js';
import type { LevelRepository } from '../../../src/application/level-catalog/ports/LevelRepository.js';
import type { DomainEventBus } from '../../../src/application/ports/DomainEventBus.js';
import type { Clock } from '../../../src/application/ports/Clock.js';
import type { IdGenerator } from '../../../src/application/ports/IdGenerator.js';
import { InvalidArgumentError } from '../../../src/domain/errors/DomainError.js';
import { UserFactory } from '../../../src/domain/identity/UserFactory.js';
import { Email } from '../../../src/domain/identity/value-objects/Email.js';
import { PasswordHash } from '../../../src/domain/identity/value-objects/PasswordHash.js';
import { Username } from '../../../src/domain/identity/value-objects/Username.js';
import type { Level } from '../../../src/domain/level-catalog/Level.js';
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
import { NotFoundError } from '../../../src/shared/errors/ApplicationError.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const LB_1 = '550e8400-e29b-41d4-a716-446655440020';
const ENTRY_1 = '550e8400-e29b-41d4-a716-446655440030';
const SEED_ENTRY = '550e8400-e29b-41d4-a716-446655440099';
const FIXED_NOW = new Date('2026-06-18T00:00:00Z');

class FakeClock implements Clock {
  now(): Date { return FIXED_NOW; }
}

class FakeIdGenerator implements IdGenerator {
  private index = 0;
  constructor(private readonly ids: string[] = [LB_1, ENTRY_1]) {}
  generate(): string {
    const id = this.ids[this.index];
    if (id === undefined) throw new Error('No fake id available');
    this.index += 1;
    return id;
  }
}

function makeExistingLeaderboard(score: number, timeSeconds = 30): Leaderboard {
  const board = Leaderboard.empty(
    LeaderboardId.create(LB_1),
    LevelId.create(LEVEL_1),
    new MaxLeaderboardEntries(10),
    FIXED_NOW,
  );
  board.submitEntry(
    ScoreEntry.create({
      id: EntryId.create(SEED_ENTRY),
      userId: UserId.create(USER_1),
      levelId: LevelId.create(LEVEL_1),
      usernameSnapshot: new UsernameSnapshot('real_player'),
      score: new Score(score),
      timeSeconds: new TimeSeconds(timeSeconds),
      movesCount: new MoveCount(15),
      submittedAt: new SubmittedAt(FIXED_NOW),
    }),
    FIXED_NOW,
  );
  board.clearEvents();
  return board;
}

function makeInput(overrides?: Partial<SubmitScoreInput>): SubmitScoreInput {
  return {
    userId: USER_1,
    levelId: LEVEL_1,
    score: 100,
    timeSeconds: 30,
    movesCount: 15,
    ...overrides,
  };
}

function makeUser() {
  return UserFactory.create(
    UserId.create(USER_1),
    Email.create('real@example.com'),
    Username.create('real_player'),
    PasswordHash.fromHash('$2b$12$hashedvalue'),
    FIXED_NOW,
  );
}

function makeRepo(leaderboard: Leaderboard | null = null): jest.Mocked<LeaderboardRepository> {
  return {
    findByLevelId: jest.fn().mockResolvedValue(leaderboard),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUserRepo(user = makeUser()): jest.Mocked<UserRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(user),
    findByEmail: jest.fn().mockResolvedValue(user),
    existsByEmail: jest.fn().mockResolvedValue(false),
    existsByUsername: jest.fn().mockResolvedValue(false),
  };
}

function makeLevelRepo(level: Level | null = {} as Level): jest.Mocked<LevelRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(level),
    findAllPublished: jest.fn().mockResolvedValue([]),
  };
}

function makeEventBus(): jest.Mocked<DomainEventBus> {
  return { publishAll: jest.fn().mockResolvedValue(undefined) };
}

function makeService(
  repo: LeaderboardRepository,
  userRepo: UserRepository = makeUserRepo(),
  levelRepo: LevelRepository = makeLevelRepo(),
  eventBus: DomainEventBus = makeEventBus(),
  idGenerator: IdGenerator = new FakeIdGenerator(),
) {
  return new SubmitScoreService(repo, userRepo, levelRepo, eventBus, idGenerator, new FakeClock());
}

describe('SubmitScoreService', () => {
  describe('execute', () => {
    it('should_save_leaderboard_when_valid_score_submitted', async () => {
      const repo = makeRepo();
      const service = makeService(repo);

      await service.execute(makeInput());

      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('should_create_empty_leaderboard_with_server_generated_id_when_none_exists_for_level', async () => {
      const repo = makeRepo(null);
      const service = makeService(repo);

      await service.execute(makeInput());

      const saved = (repo.save as jest.Mock).mock.calls[0][0] as Leaderboard;
      expect(saved.id.value).toBe(LB_1);
      expect(saved.entries).toHaveLength(1);
    });

    it('should_add_entry_with_server_generated_id_and_authenticated_username', async () => {
      const repo = makeRepo();
      const service = makeService(repo);

      await service.execute(makeInput());

      const saved = (repo.save as jest.Mock).mock.calls[0][0] as Leaderboard;
      expect(saved.entries[0]?.id.value).toBe(ENTRY_1);
      expect(saved.entries[0]?.usernameSnapshot.value).toBe('real_player');
      expect(saved.entries[0]?.userId.value).toBe(USER_1);
    });

    it('should_add_entry_to_existing_leaderboard_when_leaderboard_exists', async () => {
      const existing = Leaderboard.empty(
        LeaderboardId.create(LB_1),
        LevelId.create(LEVEL_1),
        new MaxLeaderboardEntries(10),
        FIXED_NOW,
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
      const service = makeService(repo, makeUserRepo(), makeLevelRepo(), eventBus);

      await service.execute(makeInput());

      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    });

    it('should_throw_not_found_when_user_does_not_exist', async () => {
      const service = makeService(makeRepo(), makeUserRepo(null));

      await expect(service.execute(makeInput())).rejects.toThrow(NotFoundError);
    });

    it('should_throw_not_found_when_level_does_not_exist', async () => {
      const service = makeService(makeRepo(), makeUserRepo(), makeLevelRepo(null));

      await expect(service.execute(makeInput())).rejects.toThrow(NotFoundError);
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
