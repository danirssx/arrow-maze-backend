import type { PlayerProgress } from '../../../domain/progress/PlayerProgress.js';
import type { UserId } from '../../../domain/progress/value-objects/UserId.js';

export interface IProgressRepository {
  findByUserId(userId: UserId): Promise<PlayerProgress | null>;
  save(progress: PlayerProgress): Promise<void>;
}
