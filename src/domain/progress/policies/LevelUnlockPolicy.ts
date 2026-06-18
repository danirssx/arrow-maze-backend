import type { LevelId } from '../value-objects/LevelId.js';
import type { PlayerProgress } from '../PlayerProgress.js';

export class LevelUnlockPolicy {
  isUnlocked(_levelId: LevelId, _progress: PlayerProgress): boolean {
    return true;
  }
}
