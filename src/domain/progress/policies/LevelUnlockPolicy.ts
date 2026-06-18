import type { LevelId } from '../../shared/LevelId.js';
import type { PlayerProgress } from '../PlayerProgress.js';

export class LevelUnlockPolicy {
  isUnlocked(_levelId: LevelId, _progress: PlayerProgress): boolean {
    return true;
  }
}
