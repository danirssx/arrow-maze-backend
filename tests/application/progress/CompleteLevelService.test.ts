import { jest } from '@jest/globals';
import { CompleteLevelService } from '../../../src/application/progress/use-cases/CompleteLevelService.js';
import type { IProgressRepository } from '../../../src/application/progress/ports/IProgressRepository.js';
import type { IDomainEventBus } from '../../../src/application/progress/ports/IDomainEventBus.js';
import type { DomainEvent } from '../../../src/domain/shared/DomainEvent.js';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import type { UserId } from '../../../src/domain/progress/value-objects/UserId.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { UserId as UserIdClass } from '../../../src/domain/progress/value-objects/UserId.js';

class FakeProgressRepository implements IProgressRepository {
  stored: PlayerProgress | null = null;
  async findByUserId(_userId: UserId): Promise<PlayerProgress | null> { return this.stored; }
  async save(progress: PlayerProgress): Promise<void> { this.stored = progress; }
}

class FakeEventBus implements IDomainEventBus {
  published: DomainEvent[] = [];
  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> { this.published.push(...events); }
}

const VALID_INPUT = {
  userId: 'user-1',
  progressId: 'progress-1',
  levelId: 'level-1',
  score: 100,
  timeSeconds: 30,
  movesCount: 10,
  completedAt: new Date('2026-06-18T00:00:00Z').toISOString(),
};

describe('CompleteLevelService', () => {
  it('should_record_completion_and_save_when_progress_exists', async () => {
    // Arrange
    const repo = new FakeProgressRepository();
    repo.stored = PlayerProgress.empty(new ProgressId('progress-1'), new UserIdClass('user-1'));
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    // Act
    await service.execute(VALID_INPUT);

    // Assert
    expect(repo.stored!.completedLevels).toHaveLength(1);
    expect(repo.stored!.completedLevels[0].levelId.value).toBe('level-1');
  });

  it('should_create_empty_progress_and_record_when_none_exists', async () => {
    // Arrange
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    // Act
    await service.execute(VALID_INPUT);

    // Assert
    expect(repo.stored).not.toBeNull();
    expect(repo.stored!.completedLevels).toHaveLength(1);
  });

  it('should_publish_domain_events_after_completion', async () => {
    // Arrange
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    // Act
    await service.execute(VALID_INPUT);

    // Assert
    expect(bus.published).toHaveLength(1);
  });

  it('should_preserve_best_score_when_called_twice_with_worse_result', async () => {
    // Arrange
    const repo = new FakeProgressRepository();
    const bus = new FakeEventBus();
    const service = new CompleteLevelService(repo, bus);

    // Act
    await service.execute({ ...VALID_INPUT, score: 500 });
    await service.execute({ ...VALID_INPUT, score: 50 });

    // Assert
    expect(repo.stored!.completedLevels[0].bestScore.score).toBe(500);
  });
});
