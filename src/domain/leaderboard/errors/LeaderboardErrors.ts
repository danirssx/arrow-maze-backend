export class DuplicateEntryError extends Error {
  constructor(userId: string) {
    super(`User ${userId} already has an entry in this leaderboard`);
    this.name = 'DuplicateEntryError';
  }
}

export class LeaderboardLevelMismatchError extends Error {
  constructor(entryLevelId: string, leaderboardLevelId: string) {
    super(
      `Entry levelId ${entryLevelId} does not match leaderboard levelId ${leaderboardLevelId}`,
    );
    this.name = 'LeaderboardLevelMismatchError';
  }
}
