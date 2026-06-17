import { sanitizeLogContext } from "../../src/application/aspects/sanitizeLogContext";

describe("sanitizeLogContext", () => {
  it("should_redact_sensitive_values_when_context_contains_credentials", () => {
    // Arrange
    const context = {
      email: "user@example.com",
      rawPassword: "plain-password",
      refreshToken: "refresh-token",
      nested: {
        authorization: "Bearer secret-token"
      }
    };

    // Act
    const sanitized = sanitizeLogContext(context);

    // Assert
    expect(sanitized).toEqual({
      email: "user@example.com",
      rawPassword: "[REDACTED]",
      refreshToken: "[REDACTED]",
      nested: {
        authorization: "[REDACTED]"
      }
    });
  });
});

