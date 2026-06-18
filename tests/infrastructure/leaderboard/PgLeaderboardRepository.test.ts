import { jest } from '@jest/globals';
import { PgLeaderboardRepository } from '../../../src/infrastructure/leaderboard/PgLeaderboardRepository.js';
import { Leaderboard } from '../../../src/domain/leaderboard/Leaderboard.js';
import { LeaderboardId } from '../../../src/domain/leaderboard/value-objects/LeaderboardId.js';
import { MaxLeaderboardEntries } from '../../../src/domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { InfrastructureError } from '../../../src/shared/errors/InfrastructureError.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';
import type { Pool, PoolClient } from 'pg';

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

function makeEmptyLeaderboard(): Leaderboard {
  return Leaderboard.empty(
    new LeaderboardId('lb-1'),
    LevelId.create(LEVEL_1),
    new MaxLeaderboardEntries(10),
  );
}

describe('PgLeaderboardRepository', () => {
  describe('findByLevelId', () => {
    it('should_return_null_when_no_leaderboard_found', async () => {
      const pool = makePool([{ rows: [] }]);
      const repo = new PgLeaderboardRepository(pool as unknown as Pool);

      const result = await repo.findByLevelId(LevelId.create(LEVEL_1));

      expect(result).toBeNull();
    });

    it('should_return_leaderboard_when_found', async () => {
      const lbRow = {
        id: 'lb-1',
        level_id: LEVEL_1,
        max_entries: 10,
        updated_at: new Date(),
      };
      const pool = makePool([{ rows: [lbRow] }, { rows: [] }]);
      const repo = new PgLeaderboardRepository(pool as unknown as Pool);

      const result = await repo.findByLevelId(LevelId.create(LEVEL_1));

      expect(result).not.toBeNull();
      expect(result?.id.value).toBe('lb-1');
      expect(result?.levelId.value).toBe(LEVEL_1);
    });

    it('should_throw_infrastructure_error_when_query_fails', async () => {
      const pool = {
        query: jest.fn().mockRejectedValue(new Error('DB down')),
        connect: jest.fn(),
      } as unknown as Pool;
      const repo = new PgLeaderboardRepository(pool);

      await expect(repo.findByLevelId(LevelId.create(LEVEL_1))).rejects.toThrow(InfrastructureError);
    });
  });

  describe('save', () => {
    it('should_commit_transaction_when_save_succeeds', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      const pool = {
        connect: jest.fn().mockResolvedValue(mockClient),
      } as unknown as Pool;
      const repo = new PgLeaderboardRepository(pool);
      const leaderboard = makeEmptyLeaderboard();

      await repo.save(leaderboard);

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
      const pool = {
        connect: jest.fn().mockResolvedValue(mockClient),
      } as unknown as Pool;
      const repo = new PgLeaderboardRepository(pool);

      await expect(repo.save(makeEmptyLeaderboard())).rejects.toThrow(InfrastructureError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
