import { jest } from '@jest/globals';
import { CompleteLevelService } from '../../../src/application/progress/use-cases/CompleteLevelService.js';
import type { ProgressRepository } from '../../../src/application/progress/ports/IProgressRepository.js';
import type { DomainEventBus } from '../../../src/application/ports/DomainEventBus.js';
import type { DomainEvent } from '../../../src/domain/shared/DomainEvent.js';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../src/domain/shared/UserId.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const PROGRESS_1 = '550e8400-e29b-41d4-a716-446655440020';

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

const VALID_INPUT = {
  userId: USER_1,
  levelId: LEVEL_1,
  score: 100,
  timeSeconds: 30,
  movesCount: 10,
  completedAt: new Date('2026-06-18T00:00:00Z').toISOString(),
};

describe('CompleteLevelService', () => {
  it('should_record_completion_and_save_when_progress_exists', async () => {
    const repo = new FakeProgressRepository();
    repo.stored = PlayerProgress.empty(ProgressId.create(PROGRESS_1), UserId.create(USER_1));
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    await service.execute(VALID_INPUT);

    expect(repo.stored!.completedLevels).toHaveLength(1);
    expect(repo.stored!.completedLevels[0].levelId.value).toBe(LEVEL_1);
  });

  it('should_create_empty_progress_and_record_when_none_exists', async () => {
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    await service.execute(VALID_INPUT);

    expect(repo.stored).not.toBeNull();
    expect(repo.stored!.completedLevels).toHaveLength(1);
  });

  it('should_publish_domain_events_after_completion', async () => {
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    await service.execute(VALID_INPUT);

    expect(bus.published).toHaveLength(1);
  });

  it('should_preserve_best_score_when_called_twice_with_worse_result', async () => {
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    await service.execute({ ...VALID_INPUT, score: 500 });
    await service.execute({ ...VALID_INPUT, score: 50 });

    expect(repo.stored!.completedLevels[0].bestScore.score).toBe(500);
  });

  it('should_reject_completion_and_skip_save_when_completed_at_is_invalid', async () => {
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    await expect(service.execute({ ...VALID_INPUT, completedAt: 'not-a-date' })).rejects.toThrow();

    expect(repo.saveCount).toBe(0);
    expect(bus.published).toHaveLength(0);
  });
});
