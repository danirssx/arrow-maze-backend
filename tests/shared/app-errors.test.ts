import {
  AppError,
  ApplicationError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from "../../src/shared/errors/index";
import { InfrastructureError } from "../../src/shared/errors/InfrastructureError";

describe("Application errors", () => {
  it.each([
    [new BadRequestError(), "BAD_REQUEST", 400],
    [new UnauthorizedError(), "UNAUTHORIZED", 401],
    [new ForbiddenError(), "FORBIDDEN", 403],
    [new NotFoundError(), "NOT_FOUND", 404],
    [new ConflictError(), "CONFLICT", 409],
    [new ValidationError(), "VALIDATION_ERROR", 422]
  ])("should_expose_code_and_http_status_when_%s", (error, expectedCode, expectedStatus) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(expectedCode);
    expect(error.httpStatus).toBe(expectedStatus);
  });

  it("should_preserve_custom_message_and_details_when_provided", () => {
    const error = new ValidationError("Email is invalid", { field: "email" });

    expect(error.message).toBe("Email is invalid");
    expect(error.details).toEqual({ field: "email" });
  });

  it("should_omit_details_when_not_provided", () => {
    const error = new NotFoundError("Missing user");

    expect(error.details).toBeUndefined();
  });
});

describe("Infrastructure error", () => {
  it("should_map_to_internal_server_status_when_created", () => {
    const error = new InfrastructureError("Database unavailable");

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("INFRASTRUCTURE_ERROR");
    expect(error.httpStatus).toBe(500);
    expect(error.message).toBe("Database unavailable");
  });
});
