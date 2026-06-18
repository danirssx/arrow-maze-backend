import { BusinessRuleViolationError } from "../../errors/DomainError.js";

export class ProgressUserMismatchError extends BusinessRuleViolationError {
  constructor(localUserId: string, remoteUserId: string) {
    super(`Cannot merge progress for different users: ${localUserId} vs ${remoteUserId}`);
  }
}
