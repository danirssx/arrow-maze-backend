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

  it("should_throw_invalid_argument_when_date_is_in_the_future", () => {
    // Arrange
    const futureDate = new Date(Date.now() + 60_000);

    // Act / Assert
    expect(() => new CompletedAt(futureDate)).toThrow(InvalidArgumentError);
    expect(() => new CompletedAt(futureDate)).toThrow("CompletedAt cannot be in the future");
  });
});
