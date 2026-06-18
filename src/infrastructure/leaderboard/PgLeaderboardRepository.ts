// Pattern: Repository, Adapter
import type { Pool } from 'pg';
import type { LeaderboardRepository } from '../../application/leaderboard/ports/ILeaderboardRepository.js';
import { Leaderboard } from '../../domain/leaderboard/Leaderboard.js';
import { ScoreEntry } from '../../domain/leaderboard/ScoreEntry.js';
import { EntryId } from '../../domain/leaderboard/value-objects/EntryId.js';
import { LeaderboardId } from '../../domain/leaderboard/value-objects/LeaderboardId.js';
import { MaxLeaderboardEntries } from '../../domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { MoveCount } from '../../domain/leaderboard/value-objects/MoveCount.js';
import { Rank } from '../../domain/leaderboard/value-objects/Rank.js';
import { Score } from '../../domain/leaderboard/value-objects/Score.js';
import { SubmittedAt } from '../../domain/leaderboard/value-objects/SubmittedAt.js';
import { TimeSeconds } from '../../domain/leaderboard/value-objects/TimeSeconds.js';
import { UpdatedAt } from '../../domain/leaderboard/value-objects/UpdatedAt.js';
import { UsernameSnapshot } from '../../domain/leaderboard/value-objects/UsernameSnapshot.js';
import { LevelId } from '../../domain/shared/LevelId.js';
import { UserId } from '../../domain/shared/UserId.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';

type LeaderboardRow = {
  id: string;
  level_id: string;
  max_entries: number;
  updated_at: Date;
};

type EntryRow = {
  id: string;
  user_id: string;
  level_id: string;
  username_snapshot: string;
  score: number;
  time_seconds: number;
  moves_count: number;
  rank: number | null;
  submitted_at: Date;
};

function rowToEntry(row: EntryRow): ScoreEntry {
  const props = {
    id: EntryId.create(row.id),
    userId: UserId.create(row.user_id),
    levelId: LevelId.create(row.level_id),
    usernameSnapshot: new UsernameSnapshot(row.username_snapshot),
    score: new Score(row.score),
    timeSeconds: new TimeSeconds(row.time_seconds),
    movesCount: new MoveCount(row.moves_count),
    submittedAt: new SubmittedAt(row.submitted_at),
  };
  const entry = ScoreEntry.create(props);
  return row.rank !== null ? entry.withRank(new Rank(row.rank)) : entry;
}

export class PgLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly pool: Pool) {}

  async findByLevelId(levelId: LevelId): Promise<Leaderboard | null> {
    try {
      const lbResult = await this.pool.query<LeaderboardRow>(
        'SELECT * FROM leaderboards WHERE level_id = $1',
        [levelId.value],
      );

      const lbRow = lbResult.rows[0];
      if (!lbRow) return null;

      const entriesResult = await this.pool.query<EntryRow>(
        'SELECT * FROM leaderboard_entries WHERE leaderboard_id = $1 ORDER BY rank ASC NULLS LAST',
        [lbRow.id],
      );

      return Leaderboard.create({
        id: LeaderboardId.create(lbRow.id),
        levelId: LevelId.create(lbRow.level_id),
        maxEntries: new MaxLeaderboardEntries(lbRow.max_entries),
        updatedAt: new UpdatedAt(lbRow.updated_at),
        entries: entriesResult.rows.map(rowToEntry),
      });
    } catch (err) {
      throw new InfrastructureError('Failed to find leaderboard', { cause: String(err) });
    }
  }

  async save(leaderboard: Leaderboard): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO leaderboards (id, level_id, max_entries, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
           SET max_entries = EXCLUDED.max_entries,
               updated_at  = EXCLUDED.updated_at`,
        [
          leaderboard.id.value,
          leaderboard.levelId.value,
          leaderboard.maxEntries.value,
          leaderboard.updatedAt.value,
        ],
      );

      await client.query(
        'DELETE FROM leaderboard_entries WHERE leaderboard_id = $1',
        [leaderboard.id.value],
      );

      for (const entry of leaderboard.entries) {
        await client.query(
          `INSERT INTO leaderboard_entries
             (id, leaderboard_id, user_id, level_id, username_snapshot,
              score, time_seconds, moves_count, rank, submitted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            entry.id.value,
            leaderboard.id.value,
            entry.userId.value,
            entry.levelId.value,
            entry.usernameSnapshot.value,
            entry.score.value,
            entry.timeSeconds.value,
            entry.movesCount.value,
            entry.rank?.value ?? null,
            entry.submittedAt.value,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new InfrastructureError('Failed to save leaderboard', { cause: String(err) });
    } finally {
      client.release();
    }
  }
}
