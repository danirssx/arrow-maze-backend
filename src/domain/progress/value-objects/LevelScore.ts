import { InvalidArgumentError } from "../../errors/DomainError.js";

export class LevelScore {
  constructor(
    readonly score: number,
    readonly timeSeconds: number,
    readonly movesCount: number,
  ) {
    if (!Number.isInteger(score) || score < 0) {
      throw new InvalidArgumentError('Score must be a non-negative integer');
    }
    if (isNaN(timeSeconds) || timeSeconds <= 0) {
      throw new InvalidArgumentError('TimeSeconds must be positive');
    }
    if (!Number.isInteger(movesCount) || movesCount < 1) {
      throw new InvalidArgumentError('MovesCount must be a positive integer');
    }
  }

  isBetterThan(other: LevelScore): boolean {
    if (this.score !== other.score) return this.score > other.score;
    return this.timeSeconds < other.timeSeconds;
  }
}
