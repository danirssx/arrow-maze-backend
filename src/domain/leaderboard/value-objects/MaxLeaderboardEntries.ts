import { InvalidArgumentError } from "../../errors/DomainError.js";

export class MaxLeaderboardEntries {
  static readonly DEFAULT = new MaxLeaderboardEntries(10);

  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidArgumentError('MaxLeaderboardEntries must be a positive integer');
    }
  }
}
