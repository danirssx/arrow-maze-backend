import type { Leaderboard } from '../../../domain/leaderboard/Leaderboard.js';
import type { LevelId } from '../../../domain/leaderboard/value-objects/LevelId.js';

export interface ILeaderboardRepository {
  findByLevelId(levelId: LevelId): Promise<Leaderboard | null>;
  save(leaderboard: Leaderboard): Promise<void>;
}
