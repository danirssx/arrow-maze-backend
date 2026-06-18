// Pattern: Repository, Adapter
import type { Pool } from 'pg';
import type { ProgressRepository } from '../../application/progress/ports/IProgressRepository.js';
import { CompletedLevel } from '../../domain/progress/CompletedLevel.js';
import { PlayerProgress } from '../../domain/progress/PlayerProgress.js';
import { CompletedAt } from '../../domain/progress/value-objects/CompletedAt.js';
import { CompletedLevelId } from '../../domain/progress/value-objects/CompletedLevelId.js';
import { LevelScore } from '../../domain/progress/value-objects/LevelScore.js';
import { ProgressId } from '../../domain/progress/value-objects/ProgressId.js';
import { ProgressVersion } from '../../domain/progress/value-objects/ProgressVersion.js';
import { UpdatedAt } from '../../domain/progress/value-objects/UpdatedAt.js';
import { LevelId } from '../../domain/shared/LevelId.js';
import { UserId } from '../../domain/shared/UserId.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';

type ProgressRow = {
  id: string;
  user_id: string;
  version: number;
  updated_at: Date;
};

type CompletedLevelRow = {
  id: string;
  level_id: string;
  best_score: number;
  best_time_seconds: number;
  best_moves_count: number;
  completed_at: Date;
  updated_at: Date;
};

function rowToCompletedLevel(row: CompletedLevelRow): CompletedLevel {
  return CompletedLevel.create({
    id: new CompletedLevelId(row.id),
    levelId: LevelId.create(row.level_id),
    bestScore: new LevelScore(row.best_score, Number(row.best_time_seconds), row.best_moves_count),
    completedAt: new CompletedAt(row.completed_at),
    updatedAt: new UpdatedAt(row.updated_at),
  });
}

function rowsToProgress(progressRow: ProgressRow, levelRows: CompletedLevelRow[]): PlayerProgress {
  return PlayerProgress.create({
    id: new ProgressId(progressRow.id),
    userId: UserId.create(progressRow.user_id),
    version: new ProgressVersion(progressRow.version),
    updatedAt: new UpdatedAt(progressRow.updated_at),
    completedLevels: levelRows.map(rowToCompletedLevel),
  });
}

export class PgProgressRepository implements ProgressRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserId(userId: UserId): Promise<PlayerProgress | null> {
    try {
      const progressResult = await this.pool.query<ProgressRow>(
        'SELECT * FROM player_progress WHERE user_id = $1',
        [userId.value],
      );

      const progressRow = progressResult.rows[0];
      if (!progressRow) return null;

      const levelsResult = await this.pool.query<CompletedLevelRow>(
        'SELECT * FROM completed_levels WHERE progress_id = $1',
        [progressRow.id],
      );

      return rowsToProgress(progressRow, levelsResult.rows);
    } catch (err) {
      throw new InfrastructureError('Failed to find player progress', { cause: String(err) });
    }
  }

  async save(progress: PlayerProgress): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO player_progress (id, user_id, version, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
           SET version    = EXCLUDED.version,
               updated_at = EXCLUDED.updated_at`,
        [
          progress.id.value,
          progress.userId.value,
          progress.version.value,
          progress.updatedAt.value,
        ],
      );

      await client.query(
        'DELETE FROM completed_levels WHERE progress_id = $1',
        [progress.id.value],
      );

      for (const level of progress.completedLevels) {
        await client.query(
          `INSERT INTO completed_levels
             (id, progress_id, level_id, best_score, best_time_seconds,
              best_moves_count, completed_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            level.id.value,
            progress.id.value,
            level.levelId.value,
            level.bestScore.score,
            level.bestScore.timeSeconds,
            level.bestScore.movesCount,
            level.completedAt.value,
            level.updatedAt.value,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new InfrastructureError('Failed to save player progress', { cause: String(err) });
    } finally {
      client.release();
    }
  }
}
