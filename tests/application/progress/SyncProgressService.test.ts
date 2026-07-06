import { jest } from '@jest/globals';
import { SyncProgressService } from '../../../src/application/progress/use-cases/SyncProgressService.js';
import type { ProgressRepository } from '../../../src/application/progress/ports/ProgressRepository.js';
import type { DomainEventBus } from '../../../src/application/ports/DomainEventBus.js';
import type { DomainEvent } from '../../../src/domain/shared/DomainEvent.js';
import type { IdGenerator } from '../../../src/application/ports/IdGenerator.js';
import type { Clock } from '../../../src/application/ports/Clock.js';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import { LevelCompletionResult } from '../../../src/domain/progress/LevelCompletionResult.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { CompletedAt } from '../../../src/domain/progress/value-objects/CompletedAt.js';
import { CompletedLevelId } from '../../../src/domain/progress/value-objects/CompletedLevelId.js';
import { LevelScore } from '../../../src/domain/progress/value-objects/LevelScore.js';
import type { LocalCompletedLevelDto } from '../../../src/application/progress/use-cases/SyncProgressService.js';
import { UserId } from '../../../src/domain/shared/UserId.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const LEVEL_2 = '550e8400-e29b-41d4-a716-446655440011';
const PROGRESS_1 = '550e8400-e29b-41d4-a716-446655440020';
const FAKE_ENTRY_ID = '550e8400-e29b-41d4-a716-446655440050';
const FIXED_NOW = new Date('2026-06-18T00:00:00Z');

class FakeProgressRepository implements ProgressRepository {
  stored: PlayerProgress | null = null;
  saveCount = 0;
  async findByUserId(_userId: UserId): Promise<PlayerProgress | null> { return this.stored; }
  async save(progress: PlayerProgress): Promise<void> { this.saveCount += 1; this.stored = progress; }
}

class FakeEventBus implements DomainEventBus {
  published: DomainEvent[] = [];
  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> { this.published.push(...events); }
}

class FakeIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter++;
    return `550e8400-e29b-41d4-a716-4466554400${String(this.counter).padStart(2, "0")}`;
  }
}

class FakeClock implements Clock {
  now(): Date { return FIXED_NOW; }
}

const LOCAL_LEVEL: LocalCompletedLevelDto = {
  levelId: LEVEL_1,
  score: 200,
  timeSeconds: 25,
  movesCount: 8,
  completedAt: new Date('2026-06-18T00:00:00Z').toISOString(),
};

describe('SyncProgressService', () => {
  it('should_return_merged_progress_when_remote_has_different_level', async () => {
    const repo = new FakeProgressRepository();
    const remote = PlayerProgress.empty(ProgressId.create(PROGRESS_1), UserId.create(USER_1), FIXED_NOW);
    remote.recordCompletion(
      new LevelCompletionResult(LevelId.create(LEVEL_2), new LevelScore(100, 30, 10), new CompletedAt(FIXED_NOW)),
      CompletedLevelId.create(FAKE_ENTRY_ID),
      FIXED_NOW,
    );
    remote.clearEvents();
    repo.stored = remote;
    const bus = new FakeEventBus();
    const service = new SyncProgressService(repo, bus, new FakeIdGenerator(), new FakeClock());

    const result = await service.execute({
      userId: USER_1, completedLevels: [LOCAL_LEVEL],
    });

    expect(result.completedLevels).toHaveLength(2);
  });

  it('should_keep_best_score_when_same_level_in_local_and_remote', async () => {
    const repo = new FakeProgressRepository();
    const remote = PlayerProgress.empty(ProgressId.create(PROGRESS_1), UserId.create(USER_1), FIXED_NOW);
    remote.recordCompletion(
      new LevelCompletionResult(LevelId.create(LEVEL_1), new LevelScore(50, 40, 12), new CompletedAt(FIXED_NOW)),
      CompletedLevelId.create(FAKE_ENTRY_ID),
      FIXED_NOW,
    );
    remote.clearEvents();
    repo.stored = remote;
    const bus = new FakeEventBus();
    const service = new SyncProgressService(repo, bus, new FakeIdGenerator(), new FakeClock());

    const result = await service.execute({
      userId: USER_1, completedLevels: [LOCAL_LEVEL],
    });

    expect(result.completedLevels[0].score).toBe(200);
  });

  it('should_create_progress_and_sync_when_no_remote_exists', async () => {
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new SyncProgressService(repo, bus, new FakeIdGenerator(), new FakeClock());

    const result = await service.execute({
      userId: USER_1, completedLevels: [LOCAL_LEVEL],
    });

    expect(result.completedLevels).toHaveLength(1);
    expect(result.completedLevels[0].score).toBe(200);
  });

  it('should_reject_sync_and_skip_save_when_completed_at_is_invalid', async () => {
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new SyncProgressService(repo, bus);

    await expect(service.execute({
      userId: USER_1,
      completedLevels: [{ levelId: LEVEL_1, score: 100, timeSeconds: 30, movesCount: 10, completedAt: 'not-a-date' }],
    })).rejects.toThrow();

    expect(repo.saveCount).toBe(0);
    expect(bus.published).toHaveLength(0);
  });
});
