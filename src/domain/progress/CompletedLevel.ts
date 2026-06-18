import { Entity } from '../shared/Entity.js';
import type { CompletedAt } from './value-objects/CompletedAt.js';
import type { CompletedLevelId } from './value-objects/CompletedLevelId.js';
import type { LevelId } from '../shared/LevelId.js';
import type { LevelScore } from './value-objects/LevelScore.js';
import { UpdatedAt } from './value-objects/UpdatedAt.js';

export interface CompletedLevelProps {
  id: CompletedLevelId;
  levelId: LevelId;
  bestScore: LevelScore;
  completedAt: CompletedAt;
  updatedAt: UpdatedAt;
}

export class CompletedLevel extends Entity<CompletedLevelId> {
  readonly levelId: LevelId;
  readonly bestScore: LevelScore;
  readonly completedAt: CompletedAt;
  readonly updatedAt: UpdatedAt;

  private constructor(props: CompletedLevelProps) {
    super(props.id);
    this.levelId = props.levelId;
    this.bestScore = props.bestScore;
    this.completedAt = props.completedAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CompletedLevelProps): CompletedLevel {
    return new CompletedLevel(props);
  }

  withBetterScore(score: LevelScore): CompletedLevel {
    return CompletedLevel.create({
      id: this.id,
      levelId: this.levelId,
      bestScore: score,
      completedAt: this.completedAt,
      updatedAt: UpdatedAt.now(),
    });
  }
}
