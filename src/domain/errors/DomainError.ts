export abstract class DomainError extends Error {
  readonly code: string;

  protected constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(message: string) {
    super("BUSINESS_RULE_VIOLATION", message);
  }
}

export class InvalidArgumentError extends DomainError {
  constructor(message: string) {
    super("INVALID_ARGUMENT", message);
  }
}
