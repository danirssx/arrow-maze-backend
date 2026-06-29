import { BusinessRuleViolationError } from "../../errors/DomainError.js";

export class LeaderboardLevelMismatchError extends BusinessRuleViolationError {
  constructor(entryLevelId: string, leaderboardLevelId: string) {
    super(
      `Entry levelId ${entryLevelId} does not match leaderboard levelId ${leaderboardLevelId}`
    );
  }
}
