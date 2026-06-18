import { jest } from '@jest/globals';
import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { CompleteLevelInput } from '../../../src/application/progress/use-cases/CompleteLevelService.js';
import type { LoadProgressInput, LoadProgressOutput } from '../../../src/application/progress/use-cases/LoadProgressService.js';
import type { SyncProgressInput, SyncProgressOutput } from '../../../src/application/progress/use-cases/SyncProgressService.js';
import type { TokenPayload, TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { createProgressTestApp } from '../../helpers/createProgressTestApp.js';

const EMPTY_OUTPUT: LoadProgressOutput = {
  progressId: 'p-1', userId: 'user-1', completedLevels: [], version: 0, updatedAt: new Date(),
};

class FakeLoadUseCase implements UseCase<LoadProgressInput, LoadProgressOutput> {
  async execute(_input: LoadProgressInput): Promise<LoadProgressOutput> { return EMPTY_OUTPUT; }
}
class FakeCompleteLevelUseCase implements UseCase<CompleteLevelInput, void> {
  async execute(_input: CompleteLevelInput): Promise<void> {}
}

class FakeSyncUseCase implements UseCase<SyncProgressInput, SyncProgressOutput> {
  lastInput: SyncProgressInput | null = null;
  async execute(input: SyncProgressInput): Promise<SyncProgressOutput> {
    this.lastInput = input;
    return { ...EMPTY_OUTPUT, completedLevels: input.completedLevels.map(cl => ({
      levelId: cl.levelId, score: cl.score, timeSeconds: cl.timeSeconds,
      movesCount: cl.movesCount, completedAt: new Date(cl.completedAt),
    })) };
  }
}

class FakeTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return 'fake-token'; }
  verify(token: string): TokenPayload {
    if (token === 'valid-token') return { userId: 'user-1', role: 'USER' as never };
    throw new UnauthorizedError('Invalid token');
  }
}

describe('PUT /progress/sync', () => {
  it('should_return_200_with_merged_progress', async () => {
    // Arrange
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      new FakeSyncUseCase(), new FakeTokenService(),
    );

    // Act
    const res = await request(app)
      .put('/progress/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({ completedLevels: [{ levelId: 'level-1', score: 100, timeSeconds: 30, movesCount: 10, completedAt: new Date().toISOString() }] });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('should_use_userId_from_jwt_not_from_body', async () => {
    // Arrange
    const fakeSync = new FakeSyncUseCase();
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      fakeSync, new FakeTokenService(),
    );

    // Act — body contains a different userId, JWT says user-1
    const res = await request(app)
      .put('/progress/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({ userId: 'attacker-999', completedLevels: [] });

    // Assert — service received userId from JWT, not body
    expect(res.status).toBe(200);
    expect(fakeSync.lastInput?.userId).toBe('user-1');
  });

  it('should_return_400_when_completedLevels_missing', async () => {
    // Arrange
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      new FakeSyncUseCase(), new FakeTokenService(),
    );

    // Act
    const res = await request(app)
      .put('/progress/sync')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});
