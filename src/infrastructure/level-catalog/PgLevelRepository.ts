// Pattern: Repository, Adapter
import type { Pool } from 'pg';
import type { LevelRepository } from '../../application/level-catalog/ports/LevelRepository.js';
import type { Level } from '../../domain/level-catalog/Level.js';
import type { LevelId } from '../../domain/shared/LevelId.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { getQueryRunner, withTransactionalClient } from '../../infrastructure/database/transactionContext.js';
import { arrowsToRecord, type LevelRow, rowToLevel } from './LevelMapper.js';

export class PgLevelRepository implements LevelRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: LevelId): Promise<Level | null> {
    try {
      const runner = getQueryRunner(this.pool);
      const levelResult = await runner.query<LevelRow>(
        'SELECT * FROM levels WHERE id = $1',
        [id.value],
      );

      const levelRow = levelResult.rows[0];
      if (!levelRow) return null;

      return rowToLevel(levelRow);
    } catch (err) {
      throw new InfrastructureError('Failed to find level by id', { cause: String(err) });
    }
  }

  async findAllPublished(): Promise<Level[]> {
    try {
      const runner = getQueryRunner(this.pool);
      const levelResult = await runner.query<LevelRow>(
        "SELECT * FROM levels WHERE status = 'PUBLISHED' ORDER BY created_at ASC",
      );

      if (levelResult.rows.length === 0) return [];

      return levelResult.rows.map((levelRow) => rowToLevel(levelRow));
    } catch (err) {
      throw new InfrastructureError('Failed to find published levels', { cause: String(err) });
    }
  }

  async save(level: Level): Promise<void> {
    try {
      await withTransactionalClient(this.pool, async (client) => {
        await client.query(
          `INSERT INTO levels (id, name, description, difficulty, status, version, arrows, attempts, time_limit_seconds, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE
             SET name               = EXCLUDED.name,
                 description        = EXCLUDED.description,
                 difficulty         = EXCLUDED.difficulty,
                 status             = EXCLUDED.status,
                 version            = EXCLUDED.version,
                 arrows             = EXCLUDED.arrows,
                 attempts           = EXCLUDED.attempts,
                 time_limit_seconds = EXCLUDED.time_limit_seconds,
                 updated_at         = EXCLUDED.updated_at`,
          [
            level.id.value,
            level.name.value,
            level.description.value,
            level.difficulty,
            level.status,
            level.version.value,
            JSON.stringify(arrowsToRecord(level)),
            level.definition.attempts,
            level.timeLimit?.value ?? null,
            level.createdAt,
            level.updatedAt,
          ],
        );

      });
    } catch (err) {
      if (err instanceof InfrastructureError) throw err;
      throw new InfrastructureError('Failed to save level', { cause: String(err) });
    }
  }
}
