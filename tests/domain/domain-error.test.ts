import { AppError } from "../../src/shared/errors/AppError";
import {
  BusinessRuleViolationError,
  DomainError,
  InvalidArgumentError
} from "../../src/domain/errors/DomainError";

describe("Domain errors", () => {
  it("should_be_domain_error_but_not_app_error_when_business_rule_violated", () => {
    const error = new BusinessRuleViolationError("Move is not allowed");

    expect(error).toBeInstanceOf(DomainError);
    expect(error).not.toBeInstanceOf(AppError);
    expect(error.code).toBe("BUSINESS_RULE_VIOLATION");
    expect(error.message).toBe("Move is not allowed");
    expect("httpStatus" in error).toBe(false);
  });

  it("should_be_domain_error_but_not_app_error_when_argument_is_invalid", () => {
    const error = new InvalidArgumentError("Board size must be positive");

    expect(error).toBeInstanceOf(DomainError);
    expect(error).not.toBeInstanceOf(AppError);
    expect(error.code).toBe("INVALID_ARGUMENT");
    expect("httpStatus" in error).toBe(false);
  });

  it("should_be_instance_of_error_when_domain_error_thrown", () => {
    const error = new BusinessRuleViolationError("some rule");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("BusinessRuleViolationError");
  });
});
