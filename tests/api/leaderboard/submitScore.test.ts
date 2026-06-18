import { jest } from '@jest/globals';
import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { GetLeaderboardInput, GetLeaderboardOutput } from '../../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { SubmitScoreInput } from '../../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import { ValidationError, NotFoundError } from '../../../src/shared/errors/ApplicationError.js';
import { createLeaderboardTestApp } from '../../helpers/createLeaderboardTestApp.js';

class FakeSubmitUseCase implements UseCase<SubmitScoreInput, void> {
  error: Error | null = null;
  async execute(_input: SubmitScoreInput): Promise<void> {
    if (this.error) throw this.error;
  }
}

class FakeGetUseCase implements UseCase<GetLeaderboardInput, GetLeaderboardOutput> {
  async execute(_input: GetLeaderboardInput): Promise<GetLeaderboardOutput> {
    return { leaderboardId: 'lb-1', levelId: 'level-1', entries: [], updatedAt: new Date() };
  }
}

const VALID_BODY = {
  leaderboardId: 'lb-1',
  entryId: 'entry-1',
  userId: 'user-1',
  levelId: 'level-1',
  usernameSnapshot: 'Player1',
  score: 100,
  timeSeconds: 30,
  movesCount: 15,
};

describe('POST /leaderboard/scores', () => {
  it('should_return_201_when_score_submitted_successfully', async () => {
    // Arrange
    const app = createLeaderboardTestApp(new FakeSubmitUseCase(), new FakeGetUseCase());

    // Act
    const res = await request(app).post('/leaderboard/scores').send(VALID_BODY);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
  });

  it('should_return_400_when_required_field_missing', async () => {
    // Arrange
    const app = createLeaderboardTestApp(new FakeSubmitUseCase(), new FakeGetUseCase());

    // Act
    const res = await request(app).post('/leaderboard/scores').send({ score: 100 });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should_return_422_when_use_case_throws_validation_error', async () => {
    // Arrange
    const submitUseCase = new FakeSubmitUseCase();
    submitUseCase.error = new ValidationError('Score must be a non-negative integer');
    const app = createLeaderboardTestApp(submitUseCase, new FakeGetUseCase());

    // Act
    const res = await request(app).post('/leaderboard/scores').send(VALID_BODY);

    // Assert
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
