import { jest } from '@jest/globals';
import { LoadProgressService } from '../../../src/application/progress/use-cases/LoadProgressService.js';
import type { ProgressRepository } from '../../../src/application/progress/ports/IProgressRepository.js';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../src/domain/shared/UserId.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';

class FakeProgressRepository implements ProgressRepository {
  stored: PlayerProgress | null = null;
  async findByUserId(_userId: UserId): Promise<PlayerProgress | null> { return this.stored; }
  async save(progress: PlayerProgress): Promise<void> { this.stored = progress; }
}

describe('LoadProgressService', () => {
  it('should_return_empty_progress_when_none_exists', async () => {
    const repo = new FakeProgressRepository();
    const service = new LoadProgressService(repo);

    const result = await service.execute({ userId: USER_1, newProgressId: 'progress-1' });

    expect(result.progressId).toBe('progress-1');
    expect(result.userId).toBe(USER_1);
    expect(result.completedLevels).toHaveLength(0);
    expect(result.version).toBe(0);
  });

  it('should_persist_new_empty_progress_when_none_exists', async () => {
    const repo = new FakeProgressRepository();
    const service = new LoadProgressService(repo);

    await service.execute({ userId: USER_1, newProgressId: 'progress-1' });

    expect(repo.stored).not.toBeNull();
    expect(repo.stored!.userId.value).toBe(USER_1);
  });

  it('should_return_existing_progress_when_found', async () => {
    const repo = new FakeProgressRepository();
    const existing = PlayerProgress.empty(new ProgressId('progress-1'), UserId.create(USER_1));
    repo.stored = existing;
    const service = new LoadProgressService(repo);

    const result = await service.execute({ userId: USER_1, newProgressId: 'progress-new' });

    expect(result.progressId).toBe('progress-1');
    expect(result.completedLevels).toHaveLength(0);
  });
});
