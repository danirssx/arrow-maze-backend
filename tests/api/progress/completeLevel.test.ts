import { jest } from '@jest/globals';
import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { CompleteLevelInput } from '../../../src/application/progress/use-cases/CompleteLevelService.js';
import { CompleteLevelService } from '../../../src/application/progress/use-cases/CompleteLevelService.js';
import type { ProgressRepository } from '../../../src/application/progress/ports/IProgressRepository.js';
import type { LoadProgressInput, LoadProgressOutput } from '../../../src/application/progress/use-cases/LoadProgressService.js';
import type { SyncProgressInput, SyncProgressOutput } from '../../../src/application/progress/use-cases/SyncProgressService.js';
import type { TokenPayload, TokenService } from '../../../src/application/identity/ports/TokenService.js';
import type { DomainEventBus } from '../../../src/application/ports/DomainEventBus.js';
import type { DomainEvent } from '../../../src/domain/shared/DomainEvent.js';
import type { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import type { UserId } from '../../../src/domain/shared/UserId.js';
import { UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { createProgressTestApp } from '../../helpers/createProgressTestApp.js';

const EMPTY_OUTPUT: LoadProgressOutput = {
  progressId: 'p-1', userId: 'user-1', completedLevels: [], version: 0, updatedAt: new Date(),
};

class FakeLoadUseCase implements UseCase<LoadProgressInput, LoadProgressOutput> {
  async execute(_input: LoadProgressInput): Promise<LoadProgressOutput> { return EMPTY_OUTPUT; }
}
class FakeCompleteLevelUseCase implements UseCase<CompleteLevelInput, void> {
  error: Error | null = null;
  async execute(_input: CompleteLevelInput): Promise<void> { if (this.error) throw this.error; }
}
class FakeSyncUseCase implements UseCase<SyncProgressInput, SyncProgressOutput> {
  async execute(_input: SyncProgressInput): Promise<SyncProgressOutput> { return EMPTY_OUTPUT; }
}
class FakeTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return 'fake-token'; }
  verify(token: string): TokenPayload {
    if (token === 'valid-token') return { userId: 'user-1', role: 'USER' as never };
    throw new UnauthorizedError('Invalid token');
  }
}

const VALID_BODY = {
  score: 100, timeSeconds: 30, movesCount: 10,
  completedAt: new Date('2026-06-18T00:00:00Z').toISOString(),
};

const VALID_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_LEVEL_ID = '550e8400-e29b-41d4-a716-446655440010';

class SpyProgressRepository implements ProgressRepository {
  saveCount = 0;
  async findByUserId(_userId: UserId): Promise<PlayerProgress | null> { return null; }
  async save(_progress: PlayerProgress): Promise<void> { this.saveCount += 1; }
}

class SpyEventBus implements DomainEventBus {
  async publishAll(_events: ReadonlyArray<DomainEvent>): Promise<void> {}
}

class ValidUuidTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return 'fake-token'; }
  verify(token: string): TokenPayload {
    if (token === 'valid-token') return { userId: VALID_USER_ID, role: 'USER' as never };
    throw new UnauthorizedError('Invalid token');
  }
}

describe('POST /progress/levels/:levelId/complete', () => {
  it('should_return_201_when_completion_succeeds', async () => {
    // Arrange
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      new FakeSyncUseCase(), new FakeTokenService(),
    );

    // Act
    const res = await request(app)
      .post('/progress/levels/level-1/complete')
      .set('Authorization', 'Bearer valid-token')
      .send(VALID_BODY);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
  });

  it('should_return_400_when_required_field_missing', async () => {
    // Arrange
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      new FakeSyncUseCase(), new FakeTokenService(),
    );

    // Act
    const res = await request(app)
      .post('/progress/levels/level-1/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ score: 100 });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should_return_401_when_no_token', async () => {
    // Arrange
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      new FakeSyncUseCase(), new FakeTokenService(),
    );

    // Act
    const res = await request(app)
      .post('/progress/levels/level-1/complete')
      .send(VALID_BODY);

    // Assert
    expect(res.status).toBe(401);
  });

  it('should_return_422_and_skip_save_when_completed_at_is_invalid', async () => {
    // Arrange
    const repo = new SpyProgressRepository();
    const completeLevelService = new CompleteLevelService(repo, new SpyEventBus());
    const app = createProgressTestApp(
      new FakeLoadUseCase(), completeLevelService,
      new FakeSyncUseCase(), new ValidUuidTokenService(),
    );

    // Act
    const res = await request(app)
      .post(`/progress/levels/${VALID_LEVEL_ID}/complete`)
      .set('Authorization', 'Bearer valid-token')
      .send({ ...VALID_BODY, completedAt: 'not-a-date' });

    // Assert
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_ARGUMENT');
    expect(repo.saveCount).toBe(0);
  });
});
