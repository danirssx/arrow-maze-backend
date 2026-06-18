import type { CompletedAt } from './value-objects/CompletedAt.js';
import type { LevelId } from '../shared/LevelId.js';
import type { LevelScore } from './value-objects/LevelScore.js';

export class LevelCompletionResult {
  constructor(
    readonly levelId: LevelId,
    readonly score: LevelScore,
    readonly completedAt: CompletedAt,
  ) {}
}
