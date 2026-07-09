import type { CompletedLevel } from '../CompletedLevel.js';
import { PlayerProgress } from '../PlayerProgress.js';
import { ProgressUserMismatchError } from '../errors/ProgressErrors.js';
import { UpdatedAt } from '../value-objects/UpdatedAt.js';

export class ProgressMergePolicy {
  merge(local: PlayerProgress, remote: PlayerProgress, now: Date): PlayerProgress {
    if (!local.userId.equals(remote.userId)) {
      throw new ProgressUserMismatchError(local.userId.value, remote.userId.value);
    }

    const merged = new Map<string, CompletedLevel>();

    for (const level of local.completedLevels) {
      merged.set(level.levelId.value, level);
    }

    for (const level of remote.completedLevels) {
      const existing = merged.get(level.levelId.value);
      if (!existing || level.bestScore.isBetterThan(existing.bestScore)) {
        merged.set(level.levelId.value, level);
      }
    }

    const newVersion = local.version.isAheadOf(remote.version)
      ? local.version.increment()
      : remote.version.increment();

    return PlayerProgress.create({
      id: local.id,
      userId: local.userId,
      completedLevels: [...merged.values()],
      version: newVersion,
      updatedAt: new UpdatedAt(now),
    });
  }
}
