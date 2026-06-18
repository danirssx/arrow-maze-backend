import type { Leaderboard } from '../../../domain/leaderboard/Leaderboard.js';
import type { LevelId } from '../../../domain/shared/LevelId.js';

export interface LeaderboardRepository {
  findByLevelId(levelId: LevelId): Promise<Leaderboard | null>;
  save(leaderboard: Leaderboard): Promise<void>;
}
