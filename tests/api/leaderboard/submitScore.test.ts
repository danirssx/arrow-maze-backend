import { jest } from '@jest/globals';
import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { GetLeaderboardInput, GetLeaderboardOutput } from '../../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { SubmitScoreInput } from '../../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import type { TokenPayload, TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { ValidationError, UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { createLeaderboardTestApp } from '../../helpers/createLeaderboardTestApp.js';

class FakeSubmitUseCase implements UseCase<SubmitScoreInput, void> {
  error: Error | null = null;
  lastInput: SubmitScoreInput | null = null;
  async execute(input: SubmitScoreInput): Promise<void> {
    if (this.error) throw this.error;
    this.lastInput = input;
  }
}

class FakeGetUseCase implements UseCase<GetLeaderboardInput, GetLeaderboardOutput> {
  async execute(_input: GetLeaderboardInput): Promise<GetLeaderboardOutput> {
    return { leaderboardId: 'lb-1', levelId: 'level-1', entries: [], updatedAt: new Date() };
  }
}

class FakeTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return 'fake-token'; }
  verify(token: string): TokenPayload {
    if (token === 'valid-token') return { userId: 'user-1', role: 'USER' as never };
    throw new UnauthorizedError('Invalid token');
  }
}

const VALID_BODY = {
  levelId: 'level-1',
  score: 100,
  timeSeconds: 30,
  movesCount: 15,
};

describe('POST /leaderboard/scores', () => {
  it('should_return_401_when_no_token_provided', async () => {
    // Arrange
    const app = createLeaderboardTestApp(new FakeSubmitUseCase(), new FakeGetUseCase(), new FakeTokenService());

    // Act
    const res = await request(app).post('/leaderboard/scores').send(VALID_BODY);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should_return_401_when_token_is_invalid', async () => {
    // Arrange
    const app = createLeaderboardTestApp(new FakeSubmitUseCase(), new FakeGetUseCase(), new FakeTokenService());

    // Act
    const res = await request(app).post('/leaderboard/scores').set('Authorization', 'Bearer bad-token').send(VALID_BODY);

    // Assert
    expect(res.status).toBe(401);
  });

  it('should_return_201_when_score_submitted_successfully', async () => {
    // Arrange
    const submitUseCase = new FakeSubmitUseCase();
    const app = createLeaderboardTestApp(submitUseCase, new FakeGetUseCase(), new FakeTokenService());

    // Act
    const res = await request(app).post('/leaderboard/scores').set('Authorization', 'Bearer valid-token').send(VALID_BODY);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(submitUseCase.lastInput).toEqual({
      userId: 'user-1',
      levelId: 'level-1',
      score: 100,
      timeSeconds: 30,
      movesCount: 15,
    });
  });

  it('should_ignore_spoofed_identity_and_id_fields_when_score_submitted', async () => {
    // Arrange
    const submitUseCase = new FakeSubmitUseCase();
    const app = createLeaderboardTestApp(submitUseCase, new FakeGetUseCase(), new FakeTokenService());

    // Act
    const res = await request(app)
      .post('/leaderboard/scores')
      .set('Authorization', 'Bearer valid-token')
      .send({
        ...VALID_BODY,
        leaderboardId: 'spoofed-lb',
        entryId: 'spoofed-entry',
        userId: 'spoofed-user',
        usernameSnapshot: 'spoofed_name',
      });

    // Assert
    expect(res.status).toBe(201);
    expect(submitUseCase.lastInput).toEqual({
      userId: 'user-1',
      levelId: 'level-1',
      score: 100,
      timeSeconds: 30,
      movesCount: 15,
    });
  });

  it('should_return_400_when_required_field_missing', async () => {
    // Arrange
    const app = createLeaderboardTestApp(new FakeSubmitUseCase(), new FakeGetUseCase(), new FakeTokenService());

    // Act
    const res = await request(app).post('/leaderboard/scores').set('Authorization', 'Bearer valid-token').send({ score: 100 });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should_return_422_when_use_case_throws_validation_error', async () => {
    // Arrange
    const submitUseCase = new FakeSubmitUseCase();
    submitUseCase.error = new ValidationError('Score must be a non-negative integer');
    const app = createLeaderboardTestApp(submitUseCase, new FakeGetUseCase(), new FakeTokenService());

    // Act
    const res = await request(app).post('/leaderboard/scores').set('Authorization', 'Bearer valid-token').send(VALID_BODY);

    // Assert
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
