import { jest } from '@jest/globals';
import type { Pool, PoolClient } from 'pg';
import { Difficulty } from '../../../src/domain/level-catalog/enums/Difficulty.js';
import { Direction } from '../../../src/domain/level-catalog/enums/Direction.js';
import { Level } from '../../../src/domain/level-catalog/Level.js';
import { LevelStatus } from '../../../src/domain/level-catalog/enums/LevelStatus.js';
import { ArrowSpec } from '../../../src/domain/level-catalog/value-objects/ArrowSpec.js';
import { LevelDefinition } from '../../../src/domain/level-catalog/value-objects/LevelDefinition.js';
import { LevelDescription } from '../../../src/domain/level-catalog/value-objects/LevelDescription.js';
import { LevelName } from '../../../src/domain/level-catalog/value-objects/LevelName.js';
import { LevelVersion } from '../../../src/domain/level-catalog/value-objects/LevelVersion.js';
import { Position } from '../../../src/domain/level-catalog/value-objects/Position.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';
import { PgLevelRepository } from '../../../src/infrastructure/level-catalog/PgLevelRepository.js';
import { InfrastructureError } from '../../../src/shared/errors/InfrastructureError.js';

const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const LEVEL_2 = '550e8400-e29b-41d4-a716-446655440011';

const levelRow = {
  id: LEVEL_1,
  name: 'Tutorial',
  description: 'Learn the basics',
  difficulty: 'EASY',
  status: 'PUBLISHED',
  version: 1,
  arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'UP' }],
  attempts: 5,
  time_limit_seconds: null,
  move_count: null,
  created_at: new Date(),
  updated_at: new Date(),
};

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

function makeLevel(): Level {
  const arrows = [
    ArrowSpec.create('a', '#5262FB', [Position.create(0, 0)], Direction.UP),
  ];
  return Level.reconstitute(
    LevelId.create(LEVEL_1),
    LevelName.create('Tutorial'),
    LevelDescription.create('Learn the basics'),
    LevelDefinition.create(arrows, 5),
    Difficulty.EASY,
    LevelStatus.PUBLISHED,
    LevelVersion.initial(),
    undefined,
    undefined,
    new Date(),
    new Date(),
  );
}

describe('PgLevelRepository', () => {
  describe('findById', () => {
    it('should_return_null_when_no_level_found', async () => {
      const repo = new PgLevelRepository(makePool([{ rows: [] }]) as unknown as Pool);

      const result = await repo.findById(LevelId.create(LEVEL_1));

      expect(result).toBeNull();
    });

    it('should_rehydrate_level_with_arrows_when_found', async () => {
      const repo = new PgLevelRepository(makePool([{ rows: [levelRow] }]) as unknown as Pool);

      const result = await repo.findById(LevelId.create(LEVEL_1));

      expect(result).toBeInstanceOf(Level);
      expect(result!.definition.arrows).toHaveLength(1);
      expect(result!.definition.attempts).toBe(5);
    });

    it('should_rehydrate_level_with_time_limit_when_present', async () => {
      const repo = new PgLevelRepository(makePool([{ rows: [{ ...levelRow, time_limit_seconds: 60 }] }]) as unknown as Pool);

      const result = await repo.findById(LevelId.create(LEVEL_1));

      expect(result!.timeLimit?.value).toBe(60);
    });

    it('should_throw_infrastructure_error_when_query_fails', async () => {
      const pool = { query: jest.fn().mockRejectedValue(new Error('DB down')), connect: jest.fn() } as unknown as Pool;
      const repo = new PgLevelRepository(pool);

      await expect(repo.findById(LevelId.create(LEVEL_1))).rejects.toThrow(InfrastructureError);
    });
  });

  describe('findAllPublished', () => {
    it('should_return_empty_array_when_no_published_levels', async () => {
      const repo = new PgLevelRepository(makePool([{ rows: [] }]) as unknown as Pool);

      const result = await repo.findAllPublished();

      expect(result).toEqual([]);
    });

    it('should_return_all_published_levels_with_arrows', async () => {
      const levelRow2 = { ...levelRow, id: LEVEL_2, name: 'Level 2' };
      const repo = new PgLevelRepository(makePool([{ rows: [levelRow, levelRow2] }]) as unknown as Pool);

      const result = await repo.findAllPublished();

      expect(result).toHaveLength(2);
      expect(result[1].name.value).toBe('Level 2');
    });
  });

  describe('save', () => {
    it('should_commit_transaction_when_save_succeeds', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
      const pool = { connect: jest.fn().mockResolvedValue(mockClient) } as unknown as Pool;
      const repo = new PgLevelRepository(pool);

      await repo.save(makeLevel());

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO levels'), expect.arrayContaining([5]));
    });

    it('should_rollback_and_throw_when_save_fails', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('DB error')),
        release: jest.fn(),
      };
      const pool = { connect: jest.fn().mockResolvedValue(mockClient) } as unknown as Pool;
      const repo = new PgLevelRepository(pool);

      await expect(repo.save(makeLevel())).rejects.toThrow(InfrastructureError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
