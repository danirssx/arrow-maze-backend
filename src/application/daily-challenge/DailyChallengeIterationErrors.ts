import { ApplicationError } from "../../shared/errors/ApplicationError.js";

/**
 * Application errors for the admin manual daily-challenge iteration flow. They
 * carry stable, safe codes (no provider details) and the HTTP status the
 * framework error middleware maps to; the transport layer never re-derives HTTP
 * semantics from message strings.
 */
export class InvalidDailyChallengeDateError extends ApplicationError {
  constructor(message = "Invalid daily challenge date") {
    super("INVALID_DAILY_CHALLENGE_DATE", 400, message);
  }
}

export class DailyChallengeIterationNotFoundError extends ApplicationError {
  constructor(message = "Daily challenge iteration not found") {
    super("DAILY_CHALLENGE_ITERATION_NOT_FOUND", 404, message);
  }
}
