import { BusinessRuleViolationError } from "../../errors/DomainError.js";

export class DuplicateEntryError extends BusinessRuleViolationError {
  constructor(userId: string) {
    super(`User ${userId} already has an entry in this leaderboard`);
  }
}

export class LeaderboardLevelMismatchError extends BusinessRuleViolationError {
  constructor(entryLevelId: string, leaderboardLevelId: string) {
    super(
      `Entry levelId ${entryLevelId} does not match leaderboard levelId ${leaderboardLevelId}`
    );
  }
}
