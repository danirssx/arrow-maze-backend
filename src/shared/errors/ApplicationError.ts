import { AppError, type ErrorDetails } from "./AppError.js";

/**
 * Application-layer errors: failures raised while orchestrating use cases
 * (bad input, authentication, authorization, missing resource, conflict).
 * Each concrete error encodes the HTTP status the framework should return.
 */
export abstract class ApplicationError extends AppError {}

export class BadRequestError extends ApplicationError {
  constructor(message = "Bad request", details?: ErrorDetails) {
    super("BAD_REQUEST", 400, message, details);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = "Unauthorized", details?: ErrorDetails) {
    super("UNAUTHORIZED", 401, message, details);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Forbidden", details?: ErrorDetails) {
    super("FORBIDDEN", 403, message, details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = "Resource not found", details?: ErrorDetails) {
    super("NOT_FOUND", 404, message, details);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message = "Conflict", details?: ErrorDetails) {
    super("CONFLICT", 409, message, details);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message = "Validation failed", details?: ErrorDetails) {
    super("VALIDATION_ERROR", 422, message, details);
  }
}
