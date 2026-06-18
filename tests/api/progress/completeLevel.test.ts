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
});
