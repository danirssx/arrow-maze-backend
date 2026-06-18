import { AppError } from "../../src/shared/errors/AppError";
import {
  BusinessRuleViolationError,
  DomainError,
  InvalidArgumentError
} from "../../src/domain/errors/DomainError";

describe("Domain errors", () => {
  it("should_default_to_unprocessable_status_when_business_rule_violated", () => {
    const error = new BusinessRuleViolationError("Move is not allowed", { from: "A1", to: "A4" });

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe("BUSINESS_RULE_VIOLATION");
    expect(error.httpStatus).toBe(422);
    expect(error.details).toEqual({ from: "A1", to: "A4" });
  });

  it("should_map_to_bad_request_status_when_argument_is_invalid", () => {
    const error = new InvalidArgumentError("Board size must be positive");

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe("INVALID_ARGUMENT");
    expect(error.httpStatus).toBe(400);
  });
});
