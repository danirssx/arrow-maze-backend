import { jest } from '@jest/globals';
import { PgLevelRepository } from '../../../src/infrastructure/level-catalog/PgLevelRepository.js';
import { InfrastructureError } from '../../../src/shared/errors/InfrastructureError.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';
import { Level } from '../../../src/domain/level-catalog/Level.js';
import { LevelName } from '../../../src/domain/level-catalog/value-objects/LevelName.js';
import { LevelDescription } from '../../../src/domain/level-catalog/value-objects/LevelDescription.js';
import { LevelDefinition } from '../../../src/domain/level-catalog/value-objects/LevelDefinition.js';
import { LevelVersion } from '../../../src/domain/level-catalog/value-objects/LevelVersion.js';
import { BoardSize } from '../../../src/domain/level-catalog/value-objects/BoardSize.js';
import { CellSpec } from '../../../src/domain/level-catalog/value-objects/CellSpec.js';
import { Position } from '../../../src/domain/level-catalog/value-objects/Position.js';
import { CellType } from '../../../src/domain/level-catalog/enums/CellType.js';
import { Direction } from '../../../src/domain/level-catalog/enums/Direction.js';
import { Difficulty } from '../../../src/domain/level-catalog/enums/Difficulty.js';
import { LevelStatus } from '../../../src/domain/level-catalog/enums/LevelStatus.js';
import type { Pool, PoolClient } from 'pg';

const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const LEVEL_2 = '550e8400-e29b-41d4-a716-446655440011';

const levelRow = {
  id: LEVEL_1,
  name: 'Tutorial',
  description: 'Learn the basics',
  difficulty: 'EASY',
  status: 'PUBLISHED',
  version: 1,
  board_rows: 3,
  board_cols: 3,
  time_limit_seconds: null,
  move_count: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const cellRows = [
  { row: 0, col: 0, type: 'START', direction: 'RIGHT' },
  { row: 0, col: 1, type: 'ARROW', direction: 'DOWN' },
  { row: 0, col: 2, type: 'ARROW', direction: 'LEFT' },
  { row: 1, col: 0, type: 'ARROW', direction: 'UP' },
  { row: 1, col: 1, type: 'ARROW', direction: 'RIGHT' },
  { row: 1, col: 2, type: 'EXIT', direction: null },
];

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
  const boardSize = BoardSize.create(3, 3);
  const cells = [
    CellSpec.create(Position.create(0, 0), CellType.START, Direction.RIGHT),
    CellSpec.create(Position.create(0, 1), CellType.ARROW, Direction.DOWN),
    CellSpec.create(Position.create(0, 2), CellType.ARROW, Direction.LEFT),
    CellSpec.create(Position.create(1, 0), CellType.ARROW, Direction.UP),
    CellSpec.create(Position.create(1, 1), CellType.ARROW, Direction.RIGHT),
    CellSpec.create(Position.create(1, 2), CellType.EXIT),
  ];
  return Level.reconstitute(
    LevelId.create(LEVEL_1),
    LevelName.create('Tutorial'),
    LevelDescription.create('Learn the basics'),
    LevelDefinition.create(boardSize, cells),
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
      const pool = makePool([{ rows: [] }]);
      const repo = new PgLevelRepository(pool as unknown as Pool);

      const result = await repo.findById(LevelId.create(LEVEL_1));

      expect(result).toBeNull();
    });

    it('should_rehydrate_level_with_cells_when_found', async () => {
      const pool = makePool([{ rows: [levelRow] }, { rows: cellRows }]);
      const repo = new PgLevelRepository(pool as unknown as Pool);

      const result = await repo.findById(LevelId.create(LEVEL_1));

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Level);
      expect(result!.id.value).toBe(LEVEL_1);
      expect(result!.name.value).toBe('Tutorial');
      expect(result!.definition.cells).toHaveLength(6);
    });

    it('should_rehydrate_level_with_time_limit_when_present', async () => {
      const rowWithLimit = { ...levelRow, time_limit_seconds: 60 };
      const pool = makePool([{ rows: [rowWithLimit] }, { rows: cellRows }]);
      const repo = new PgLevelRepository(pool as unknown as Pool);

      const result = await repo.findById(LevelId.create(LEVEL_1));

      expect(result!.timeLimit?.value).toBe(60);
    });

    it('should_rehydrate_level_with_move_count_when_present', async () => {
      const rowWithMoves = { ...levelRow, move_count: 10 };
      const pool = makePool([{ rows: [rowWithMoves] }, { rows: cellRows }]);
      const repo = new PgLevelRepository(pool as unknown as Pool);

      const result = await repo.findById(LevelId.create(LEVEL_1));

      expect(result!.moveCount?.value).toBe(10);
    });

    it('should_throw_infrastructure_error_when_query_fails', async () => {
      const pool = {
        query: jest.fn().mockRejectedValue(new Error('DB down')),
        connect: jest.fn(),
      } as unknown as Pool;
      const repo = new PgLevelRepository(pool);

      await expect(repo.findById(LevelId.create(LEVEL_1))).rejects.toThrow(InfrastructureError);
    });
  });

  describe('findAllPublished', () => {
    it('should_return_empty_array_when_no_published_levels', async () => {
      const pool = makePool([{ rows: [] }]);
      const repo = new PgLevelRepository(pool as unknown as Pool);

      const result = await repo.findAllPublished();

      expect(result).toEqual([]);
    });

    it('should_return_all_published_levels_with_cells', async () => {
      const levelRow2 = { ...levelRow, id: LEVEL_2, name: 'Level 2' };
      const pool = makePool([
        { rows: [levelRow, levelRow2] },
        { rows: cellRows },
        { rows: cellRows },
      ]);
      const repo = new PgLevelRepository(pool as unknown as Pool);

      const result = await repo.findAllPublished();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Level);
      expect(result[1].name.value).toBe('Level 2');
    });

    it('should_throw_infrastructure_error_when_query_fails', async () => {
      const pool = {
        query: jest.fn().mockRejectedValue(new Error('DB down')),
        connect: jest.fn(),
      } as unknown as Pool;
      const repo = new PgLevelRepository(pool);

      await expect(repo.findAllPublished()).rejects.toThrow(InfrastructureError);
    });
  });

  describe('save', () => {
    it('should_commit_transaction_when_save_succeeds', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      const pool = { connect: jest.fn().mockResolvedValue(mockClient) } as unknown as Pool;
      const repo = new PgLevelRepository(pool);

      await repo.save(makeLevel());

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
      const repo = new PgLevelRepository(pool);

      await expect(repo.save(makeLevel())).rejects.toThrow(InfrastructureError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
