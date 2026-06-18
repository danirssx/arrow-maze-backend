import { jest } from '@jest/globals';
import { PgProgressRepository } from '../../../src/infrastructure/progress/PgProgressRepository.js';
import { PlayerProgress } from '../../../src/domain/progress/PlayerProgress.js';
import { ProgressId } from '../../../src/domain/progress/value-objects/ProgressId.js';
import { LevelScore } from '../../../src/domain/progress/value-objects/LevelScore.js';
import { LevelCompletionResult } from '../../../src/domain/progress/LevelCompletionResult.js';
import { CompletedAt } from '../../../src/domain/progress/value-objects/CompletedAt.js';
import { InfrastructureError } from '../../../src/shared/errors/InfrastructureError.js';
import { UserId } from '../../../src/domain/shared/UserId.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';
import type { Pool, PoolClient } from 'pg';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';

function makePool(queryResponses: unknown[]): jest.Mocked<Pool> {
  let callCount = 0;
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  } as unknown as jest.Mocked<PoolClient>;

  return {
    query: jest.fn().mockImplementation(() => {
      const response = queryResponses[callCount++] ?? { rows: [] };
      return Promise.resolve(response);
    }),
    connect: jest.fn().mockResolvedValue(mockClient),
  } as unknown as jest.Mocked<Pool>;
}

function makeEmptyProgress(): PlayerProgress {
  return PlayerProgress.empty(new ProgressId('progress-1'), UserId.create(USER_1));
}

describe('PgProgressRepository', () => {
  describe('findByUserId', () => {
    it('should_return_null_when_no_progress_found', async () => {
      const pool = makePool([{ rows: [] }]);
      const repo = new PgProgressRepository(pool as unknown as Pool);

      const result = await repo.findByUserId(UserId.create(USER_1));

      expect(result).toBeNull();
    });

    it('should_rehydrate_progress_with_completed_levels_when_found', async () => {
      const progressRow = { id: 'progress-1', user_id: USER_1, version: 2, updated_at: new Date() };
      const levelRow = {
        id: 'cl-1', level_id: LEVEL_1, best_score: 200, best_time_seconds: 25,
        best_moves_count: 8, completed_at: new Date(), updated_at: new Date(),
      };
      const pool = makePool([{ rows: [progressRow] }, { rows: [levelRow] }]);
      const repo = new PgProgressRepository(pool as unknown as Pool);

      const result = await repo.findByUserId(UserId.create(USER_1));

      expect(result).not.toBeNull();
      expect(result!.id.value).toBe('progress-1');
      expect(result!.version.value).toBe(2);
      expect(result!.completedLevels).toHaveLength(1);
      expect(result!.completedLevels[0].levelId.value).toBe(LEVEL_1);
      expect(result!.completedLevels[0].bestScore.score).toBe(200);
    });

    it('should_throw_infrastructure_error_when_query_fails', async () => {
      const pool = {
        query: jest.fn().mockRejectedValue(new Error('DB down')),
        connect: jest.fn(),
      } as unknown as Pool;
      const repo = new PgProgressRepository(pool);

      await expect(repo.findByUserId(UserId.create(USER_1))).rejects.toThrow(InfrastructureError);
    });
  });

  describe('save', () => {
    it('should_commit_transaction_when_save_succeeds', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      const pool = { connect: jest.fn().mockResolvedValue(mockClient) } as unknown as Pool;
      const repo = new PgProgressRepository(pool);

      await repo.save(makeEmptyProgress());

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should_rollback_and_throw_when_save_fails', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('DB error')),
        release: jest.fn(),
      };
      const pool = { connect: jest.fn().mockResolvedValue(mockClient) } as unknown as Pool;
      const repo = new PgProgressRepository(pool);

      await expect(repo.save(makeEmptyProgress())).rejects.toThrow(InfrastructureError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
