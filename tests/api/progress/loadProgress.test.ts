import { jest } from '@jest/globals';
import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { CompleteLevelInput } from '../../../src/application/progress/use-cases/CompleteLevelService.js';
import type { LoadProgressInput, LoadProgressOutput } from '../../../src/application/progress/use-cases/LoadProgressService.js';
import type { SyncProgressInput, SyncProgressOutput } from '../../../src/application/progress/use-cases/SyncProgressService.js';
import type { TokenPayload } from '../../../src/application/identity/ports/TokenService.js';
import type { TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { createProgressTestApp } from '../../helpers/createProgressTestApp.js';

const EMPTY_OUTPUT: LoadProgressOutput = {
  progressId: 'progress-user-1', userId: 'user-1',
  completedLevels: [], version: 0, updatedAt: new Date().toISOString(),
};

class FakeLoadUseCase implements UseCase<LoadProgressInput, LoadProgressOutput> {
  async execute(_input: LoadProgressInput): Promise<LoadProgressOutput> { return EMPTY_OUTPUT; }
}
class FakeCompleteLevelUseCase implements UseCase<CompleteLevelInput, void> {
  async execute(_input: CompleteLevelInput): Promise<void> {}
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

describe('GET /progress/me', () => {
  it('should_return_401_when_no_token_provided', async () => {
    // Arrange
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      new FakeSyncUseCase(), new FakeTokenService(),
    );

    // Act
    const res = await request(app).get('/progress/me');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should_return_401_when_token_is_invalid', async () => {
    // Arrange
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      new FakeSyncUseCase(), new FakeTokenService(),
    );

    // Act
    const res = await request(app).get('/progress/me').set('Authorization', 'Bearer bad-token');

    // Assert
    expect(res.status).toBe(401);
  });

  it('should_return_200_with_progress_when_token_is_valid', async () => {
    // Arrange
    const app = createProgressTestApp(
      new FakeLoadUseCase(), new FakeCompleteLevelUseCase(),
      new FakeSyncUseCase(), new FakeTokenService(),
    );

    // Act
    const res = await request(app).get('/progress/me').set('Authorization', 'Bearer valid-token');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.userId).toBe('user-1');
  });
});
