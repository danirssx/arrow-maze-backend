export class MaxLeaderboardEntries {
  static readonly DEFAULT = new MaxLeaderboardEntries(10);

  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('MaxLeaderboardEntries must be a positive integer');
    }
  }
}
