import { jest } from '@jest/globals';
import { LoadProgressService } from '../../../src/application/progress/use-cases/LoadProgressService.js';
import type { ProgressRepository } from '../../../src/application/progress/ports/IProgressRepository.js';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../src/domain/shared/UserId.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const PROGRESS_1 = '550e8400-e29b-41d4-a716-446655440020';

class FakeProgressRepository implements ProgressRepository {
  stored: PlayerProgress | null = null;
  async findByUserId(_userId: UserId): Promise<PlayerProgress | null> { return this.stored; }
  async save(progress: PlayerProgress): Promise<void> { this.stored = progress; }
}

describe('LoadProgressService', () => {
  it('should_return_empty_progress_when_none_exists', async () => {
    const repo = new FakeProgressRepository();
    const service = new LoadProgressService(repo);

    const result = await service.execute({ userId: USER_1 });

    expect(result.progressId).toBeTruthy();
    expect(result.userId).toBe(USER_1);
    expect(result.completedLevels).toHaveLength(0);
    expect(result.version).toBe(0);
  });

  it('should_not_persist_when_no_progress_exists', async () => {
    const repo = new FakeProgressRepository();
    const service = new LoadProgressService(repo);

    await service.execute({ userId: USER_1 });

    expect(repo.stored).toBeNull();
  });

  it('should_return_existing_progress_when_found', async () => {
    const repo = new FakeProgressRepository();
    const existing = PlayerProgress.empty(ProgressId.create(PROGRESS_1), UserId.create(USER_1));
    repo.stored = existing;
    const service = new LoadProgressService(repo);

    const result = await service.execute({ userId: USER_1 });

    expect(result.progressId).toBe(PROGRESS_1);
    expect(result.completedLevels).toHaveLength(0);
  });
});
