import { jest } from '@jest/globals';
import { SyncProgressService } from '../../../src/application/progress/use-cases/SyncProgressService.js';
import type { ProgressRepository } from '../../../src/application/progress/ports/IProgressRepository.js';
import type { DomainEventBus } from '../../../src/application/ports/DomainEventBus.js';
import type { DomainEvent } from '../../../src/domain/shared/DomainEvent.js';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import { LevelCompletionResult } from '../../../src/domain/progress/LevelCompletionResult.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { LevelScore } from '../../../src/domain/progress/value-objects/LevelScore.js';
import { CompletedAt } from '../../../src/domain/progress/value-objects/CompletedAt.js';
import type { LocalCompletedLevelDto } from '../../../src/application/progress/use-cases/SyncProgressService.js';
import { UserId } from '../../../src/domain/shared/UserId.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const LEVEL_2 = '550e8400-e29b-41d4-a716-446655440011';

class FakeProgressRepository implements ProgressRepository {
  stored: PlayerProgress | null = null;
  async findByUserId(_userId: UserId): Promise<PlayerProgress | null> { return this.stored; }
  async save(progress: PlayerProgress): Promise<void> { this.stored = progress; }
}

class FakeEventBus implements DomainEventBus {
  published: DomainEvent[] = [];
  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> { this.published.push(...events); }
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
    const remote = PlayerProgress.empty(new ProgressId('p-1'), UserId.create(USER_1));
    remote.recordCompletion(new LevelCompletionResult(
      LevelId.create(LEVEL_2), new LevelScore(100, 30, 10), CompletedAt.now(),
    ));
    remote.clearEvents();
    repo.stored = remote;
    const bus = new FakeEventBus();
    const service = new SyncProgressService(repo, bus);

    const result = await service.execute({
      userId: USER_1, progressId: 'p-1', completedLevels: [LOCAL_LEVEL],
    });

    expect(result.completedLevels).toHaveLength(2);
  });

  it('should_keep_best_score_when_same_level_in_local_and_remote', async () => {
    const repo = new FakeProgressRepository();
    const remote = PlayerProgress.empty(new ProgressId('p-1'), UserId.create(USER_1));
    remote.recordCompletion(new LevelCompletionResult(
      LevelId.create(LEVEL_1), new LevelScore(50, 40, 12), CompletedAt.now(),
    ));
    remote.clearEvents();
    repo.stored = remote;
    const bus = new FakeEventBus();
    const service = new SyncProgressService(repo, bus);

    const result = await service.execute({
      userId: USER_1, progressId: 'p-1', completedLevels: [LOCAL_LEVEL],
    });

    expect(result.completedLevels[0].score).toBe(200);
  });

  it('should_create_progress_and_sync_when_no_remote_exists', async () => {
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new SyncProgressService(repo, bus);

    const result = await service.execute({
      userId: USER_1, progressId: 'p-new', completedLevels: [LOCAL_LEVEL],
    });

    expect(result.completedLevels).toHaveLength(1);
    expect(result.completedLevels[0].score).toBe(200);
  });
});
