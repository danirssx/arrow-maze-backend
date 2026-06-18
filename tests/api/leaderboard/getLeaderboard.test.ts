import { jest } from '@jest/globals';
import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { GetLeaderboardInput, GetLeaderboardOutput } from '../../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { SubmitScoreInput } from '../../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import { NotFoundError } from '../../../src/shared/errors/ApplicationError.js';
import { createLeaderboardTestApp } from '../../helpers/createLeaderboardTestApp.js';

class FakeSubmitUseCase implements UseCase<SubmitScoreInput, void> {
  async execute(_input: SubmitScoreInput): Promise<void> {}
}

class FakeGetUseCase implements UseCase<GetLeaderboardInput, GetLeaderboardOutput> {
  result: GetLeaderboardOutput = {
    leaderboardId: 'lb-1',
    levelId: 'level-1',
    entries: [
      {
        entryId: 'entry-1',
        userId: 'user-1',
        usernameSnapshot: 'Player1',
        score: 100,
        timeSeconds: 30,
        movesCount: 15,
        rank: 1,
        submittedAt: new Date('2026-06-17T00:00:00Z'),
      },
    ],
    updatedAt: new Date('2026-06-17T00:00:00Z'),
  };
  error: Error | null = null;
  async execute(_input: GetLeaderboardInput): Promise<GetLeaderboardOutput> {
    if (this.error) throw this.error;
    return this.result;
  }
}

describe('GET /leaderboard/:levelId', () => {
  it('should_return_200_with_leaderboard_when_found', async () => {
    // Arrange
    const app = createLeaderboardTestApp(new FakeSubmitUseCase(), new FakeGetUseCase());

    // Act
    const res = await request(app).get('/leaderboard/level-1');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.levelId).toBe('level-1');
    expect(res.body.data.entries).toHaveLength(1);
    expect(res.body.data.entries[0].rank).toBe(1);
  });

  it('should_return_200_with_empty_entries_when_leaderboard_is_empty', async () => {
    // Arrange
    const getUseCase = new FakeGetUseCase();
    getUseCase.result = { leaderboardId: 'lb-1', levelId: 'level-1', entries: [], updatedAt: new Date() };
    const app = createLeaderboardTestApp(new FakeSubmitUseCase(), getUseCase);

    // Act
    const res = await request(app).get('/leaderboard/level-1');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.entries).toHaveLength(0);
  });

  it('should_return_404_when_leaderboard_not_found', async () => {
    // Arrange
    const getUseCase = new FakeGetUseCase();
    getUseCase.error = new NotFoundError('Leaderboard not found for level level-99');
    const app = createLeaderboardTestApp(new FakeSubmitUseCase(), getUseCase);

    // Act
    const res = await request(app).get('/leaderboard/level-99');

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
