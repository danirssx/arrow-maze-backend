import { InvalidArgumentError } from "../../../../src/domain/errors/DomainError.js";
import { CompletedAt } from "../../../../src/domain/progress/value-objects/CompletedAt.js";

describe("CompletedAt", () => {
  it("should_create_completed_at_when_date_is_valid", () => {
    // Arrange
    const date = new Date("2026-06-18T00:00:00Z");

    // Act
    const completedAt = new CompletedAt(date);

    // Assert
    expect(completedAt.value).toBe(date);
  });

  it("should_throw_invalid_argument_when_date_is_invalid", () => {
    // Arrange
    const invalidDate = new Date("not-a-date");

    // Act / Assert
    expect(() => new CompletedAt(invalidDate)).toThrow(InvalidArgumentError);
    expect(() => new CompletedAt(invalidDate)).toThrow("CompletedAt must be a valid date");
  });

  it("should_accept_when_date_is_slightly_in_the_future_within_skew_tolerance", () => {
    // Arrange — a mobile device clock one minute ahead of the server is tolerated
    const slightlyFuture = new Date(Date.now() + 60_000);

    // Act / Assert
    expect(() => new CompletedAt(slightlyFuture)).not.toThrow();
  });

  it("should_accept_when_date_is_at_the_skew_tolerance_boundary", () => {
    // Arrange — exactly at the tolerance is still accepted (inclusive boundary)
    const atBoundary = new Date(Date.now() + CompletedAt.CLOCK_SKEW_TOLERANCE_MS);

    // Act / Assert
    expect(() => new CompletedAt(atBoundary)).not.toThrow();
  });

  it("should_throw_invalid_argument_when_date_is_far_in_the_future", () => {
    // Arrange — beyond the tolerated skew window is a clearly invalid timestamp
    const farFuture = new Date(Date.now() + CompletedAt.CLOCK_SKEW_TOLERANCE_MS + 60_000);

    // Act / Assert
    expect(() => new CompletedAt(farFuture)).toThrow(InvalidArgumentError);
    expect(() => new CompletedAt(farFuture)).toThrow("CompletedAt is too far in the future");
  });
});
