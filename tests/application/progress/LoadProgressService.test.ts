import { jest } from '@jest/globals';
import { LoadProgressService } from '../../../src/application/progress/use-cases/LoadProgressService.js';
import type { IProgressRepository } from '../../../src/application/progress/ports/IProgressRepository.js';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import type { UserId } from '../../../src/domain/progress/value-objects/UserId.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { UserId as UserIdClass } from '../../../src/domain/progress/value-objects/UserId.js';

class FakeProgressRepository implements IProgressRepository {
  stored: PlayerProgress | null = null;
  async findByUserId(_userId: UserId): Promise<PlayerProgress | null> { return this.stored; }
  async save(progress: PlayerProgress): Promise<void> { this.stored = progress; }
}

describe('LoadProgressService', () => {
  it('should_return_empty_progress_when_none_exists', async () => {
    // Arrange
    const repo = new FakeProgressRepository();
    const service = new LoadProgressService(repo);

    // Act
    const result = await service.execute({ userId: 'user-1', newProgressId: 'progress-1' });

    // Assert
    expect(result.progressId).toBe('progress-1');
    expect(result.userId).toBe('user-1');
    expect(result.completedLevels).toHaveLength(0);
    expect(result.version).toBe(0);
  });

  it('should_persist_new_empty_progress_when_none_exists', async () => {
    // Arrange
    const repo = new FakeProgressRepository();
    const service = new LoadProgressService(repo);

    // Act
    await service.execute({ userId: 'user-1', newProgressId: 'progress-1' });

    // Assert
    expect(repo.stored).not.toBeNull();
    expect(repo.stored!.userId.value).toBe('user-1');
  });

  it('should_return_existing_progress_when_found', async () => {
    // Arrange
    const repo = new FakeProgressRepository();
    const existing = PlayerProgress.empty(new ProgressId('progress-1'), new UserIdClass('user-1'));
    repo.stored = existing;
    const service = new LoadProgressService(repo);

    // Act
    const result = await service.execute({ userId: 'user-1', newProgressId: 'progress-new' });

    // Assert
    expect(result.progressId).toBe('progress-1');
    expect(result.completedLevels).toHaveLength(0);
  });
});
