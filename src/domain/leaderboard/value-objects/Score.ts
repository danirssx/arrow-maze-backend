import { InvalidArgumentError } from "../../errors/DomainError.js";

export class Score {
  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new InvalidArgumentError('Score must be a non-negative integer');
    }
  }

  isHigherThan(other: Score): boolean {
    return this.value > other.value;
  }
}
