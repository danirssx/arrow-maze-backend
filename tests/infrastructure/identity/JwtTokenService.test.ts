import { JwtTokenService } from "../../../src/infrastructure/identity/JwtTokenService";
import { UserRole } from "../../../src/domain/identity/enums/UserRole";
import { UnauthorizedError } from "../../../src/shared/errors/ApplicationError";
import type { TokenPayload } from "../../../src/application/identity/ports/TokenService";

// Subject to human review — infrastructure adapter test
describe("JwtTokenService", () => {
  const secret = "test-secret-for-unit-tests";
  const service = new JwtTokenService(secret);
  const payload: TokenPayload = { userId: "550e8400-e29b-41d4-a716-446655440000", role: UserRole.USER };

  describe("generate", () => {
    it("should_return_jwt_string_when_payload_is_valid", () => {
      // Arrange / Act
      const token = service.generate(payload);

      // Assert
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });
  });

  describe("verify", () => {
    it("should_return_token_payload_when_token_is_valid", () => {
      // Arrange
      const token = service.generate(payload);

      // Act
      const result = service.verify(token);

      // Assert
      expect(result.userId).toBe(payload.userId);
      expect(result.role).toBe(payload.role);
    });

    it("should_throw_unauthorized_error_when_token_is_malformed", () => {
      // Arrange
      const badToken = "not.a.valid.token";

      // Act / Assert
      expect(() => service.verify(badToken)).toThrow(UnauthorizedError);
    });

    it("should_throw_unauthorized_error_when_token_is_signed_with_wrong_secret", () => {
      // Arrange
      const otherService = new JwtTokenService("wrong-secret");
      const token = otherService.generate(payload);

      // Act / Assert
      expect(() => service.verify(token)).toThrow(UnauthorizedError);
    });
  });
});
