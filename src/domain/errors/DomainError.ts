import { AppError, type ErrorDetails } from "../../shared/errors/AppError.js";

/**
 * Domain-layer errors: violations of business rules and invariants.
 *
 * Domain depends only on the shared error kernel (`AppError`), never on
 * application, infrastructure, or framework code. The default HTTP status is
 * 422 (Unprocessable Entity) because a domain rule rejected an otherwise
 * well-formed request; subclasses may override it.
 */
export abstract class DomainError extends AppError {
  protected constructor(code: string, message: string, httpStatus = 422, details?: ErrorDetails) {
    super(code, httpStatus, message, details);
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super("BUSINESS_RULE_VIOLATION", message, 422, details);
  }
}

export class InvalidArgumentError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super("INVALID_ARGUMENT", message, 400, details);
  }
}
