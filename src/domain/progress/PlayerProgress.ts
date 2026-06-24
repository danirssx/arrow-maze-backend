import { Entity } from '../shared/Entity.js';
import { CompletedLevel } from './CompletedLevel.js';
import { LevelBestScoreUpdatedEvent } from './events/LevelBestScoreUpdatedEvent.js';
import { LevelCompletedEvent } from './events/LevelCompletedEvent.js';
import type { LevelCompletionResult } from './LevelCompletionResult.js';
import type { CompletedLevelId } from './value-objects/CompletedLevelId.js';
import type { LevelId } from '../shared/LevelId.js';
import type { ProgressId } from './value-objects/ProgressId.js';
import { ProgressVersion } from './value-objects/ProgressVersion.js';
import { UpdatedAt } from './value-objects/UpdatedAt.js';
import type { UserId } from '../shared/UserId.js';

export interface PlayerProgressProps {
  id: ProgressId;
  userId: UserId;
  completedLevels: CompletedLevel[];
  version: ProgressVersion;
  updatedAt: UpdatedAt;
}

export class PlayerProgress extends Entity<ProgressId> {
  readonly userId: UserId;
  private _completedLevels: Map<string, CompletedLevel>;
  private _version: ProgressVersion;
  private _updatedAt: UpdatedAt;

  private constructor(props: PlayerProgressProps) {
    super(props.id);
    this.userId = props.userId;
    this._completedLevels = new Map(
      props.completedLevels.map((cl) => [cl.levelId.value, cl]),
    );
    this._version = props.version;
    this._updatedAt = props.updatedAt;
  }

  static create(props: PlayerProgressProps): PlayerProgress {
    return new PlayerProgress(props);
  }

  static empty(id: ProgressId, userId: UserId, now: Date): PlayerProgress {
    return new PlayerProgress({
      id,
      userId,
      completedLevels: [],
      version: new ProgressVersion(0),
      updatedAt: new UpdatedAt(now),
    });
  }

  get completedLevels(): ReadonlyArray<CompletedLevel> {
    return [...this._completedLevels.values()];
  }

  get version(): ProgressVersion {
    return this._version;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  hasCompleted(levelId: LevelId): boolean {
    return this._completedLevels.has(levelId.value);
  }

  recordCompletion(result: LevelCompletionResult, newEntryId: CompletedLevelId, now: Date): void {
    const key = result.levelId.value;
    const existing = this._completedLevels.get(key);

    if (!existing) {
      const entry = CompletedLevel.create({
        id: newEntryId,
        levelId: result.levelId,
        bestScore: result.score,
        completedAt: result.completedAt,
        updatedAt: new UpdatedAt(now),
      });
      this._completedLevels.set(key, entry);
      this.record(new LevelCompletedEvent(this.id.value, result.levelId.value, this.userId.value, now));
    } else if (result.score.isBetterThan(existing.bestScore)) {
      this._completedLevels.set(key, existing.withBetterScore(result.score, now));
      this.record(new LevelBestScoreUpdatedEvent(this.id.value, result.levelId.value, this.userId.value, now));
    }

    this._version = this._version.increment();
    this._updatedAt = new UpdatedAt(now);
  }
}
