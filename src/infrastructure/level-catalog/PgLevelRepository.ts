// Pattern: Repository, Adapter
import type { Pool } from 'pg';
import type { LevelRepository } from '../../application/level-catalog/ports/LevelRepository.js';
import type { Level } from '../../domain/level-catalog/Level.js';
import type { LevelId } from '../../domain/shared/LevelId.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { type CellRow, type LevelRow, rowToLevel } from './LevelMapper.js';

export class PgLevelRepository implements LevelRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: LevelId): Promise<Level | null> {
    try {
      const levelResult = await this.pool.query<LevelRow>(
        'SELECT * FROM levels WHERE id = $1',
        [id.value],
      );

      const levelRow = levelResult.rows[0];
      if (!levelRow) return null;

      const cellResult = await this.pool.query<CellRow>(
        'SELECT row, col, type, direction FROM level_cells WHERE level_id = $1 ORDER BY row, col',
        [levelRow.id],
      );

      return rowToLevel(levelRow, cellResult.rows);
    } catch (err) {
      throw new InfrastructureError('Failed to find level by id', { cause: String(err) });
    }
  }

  async findAllPublished(): Promise<Level[]> {
    try {
      const levelResult = await this.pool.query<LevelRow>(
        "SELECT * FROM levels WHERE status = 'PUBLISHED' ORDER BY created_at ASC",
      );

      if (levelResult.rows.length === 0) return [];

      const levels: Level[] = [];
      for (const levelRow of levelResult.rows) {
        const cellResult = await this.pool.query<CellRow>(
          'SELECT row, col, type, direction FROM level_cells WHERE level_id = $1 ORDER BY row, col',
          [levelRow.id],
        );
        levels.push(rowToLevel(levelRow, cellResult.rows));
      }

      return levels;
    } catch (err) {
      throw new InfrastructureError('Failed to find published levels', { cause: String(err) });
    }
  }

  async save(level: Level): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO levels (id, name, description, difficulty, status, version, board_rows, board_cols, time_limit_seconds, move_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE
           SET name               = EXCLUDED.name,
               description        = EXCLUDED.description,
               difficulty         = EXCLUDED.difficulty,
               status             = EXCLUDED.status,
               version            = EXCLUDED.version,
               board_rows         = EXCLUDED.board_rows,
               board_cols         = EXCLUDED.board_cols,
               time_limit_seconds = EXCLUDED.time_limit_seconds,
               move_count         = EXCLUDED.move_count,
               updated_at         = EXCLUDED.updated_at`,
        [
          level.id.value,
          level.name.value,
          level.description.value,
          level.difficulty,
          level.status,
          level.version.value,
          level.definition.boardSize.rows,
          level.definition.boardSize.cols,
          level.timeLimit?.value ?? null,
          level.moveCount?.value ?? null,
          level.createdAt,
          level.updatedAt,
        ],
      );

      await client.query(
        'DELETE FROM level_cells WHERE level_id = $1',
        [level.id.value],
      );

      for (const cell of level.definition.cells) {
        await client.query(
          `INSERT INTO level_cells (level_id, row, col, type, direction)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            level.id.value,
            cell.position.row,
            cell.position.col,
            cell.type,
            cell.direction ?? null,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new InfrastructureError('Failed to save level', { cause: String(err) });
    } finally {
      client.release();
    }
  }
}
