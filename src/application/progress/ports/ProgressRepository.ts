import type { PlayerProgress } from '../../../domain/progress/PlayerProgress.js';
import type { UserId } from '../../../domain/shared/UserId.js';

export interface ProgressRepository {
  findByUserId(userId: UserId): Promise<PlayerProgress | null>;
  save(progress: PlayerProgress): Promise<void>;
}
