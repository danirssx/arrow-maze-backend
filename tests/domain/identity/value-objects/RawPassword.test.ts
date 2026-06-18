import { RawPassword } from "../../../../src/domain/identity/value-objects/RawPassword.js";
import { DomainError, InvalidArgumentError } from "../../../../src/domain/errors/DomainError.js";

describe("RawPassword", () => {
  describe("create", () => {
    it("should_create_raw_password_when_length_meets_minimum", () => {
      const password = RawPassword.create("secureP@ss");
      expect(password.getValue()).toBe("secureP@ss");
    });

    it("should_throw_domain_error_when_password_is_empty", () => {
      expect(() => RawPassword.create("")).toThrow(DomainError);
    });

    it("should_throw_domain_error_when_password_is_too_short", () => {
      expect(() => RawPassword.create("short")).toThrow(DomainError);
    });

    it("should_throw_invalid_argument_error_when_password_is_too_short", () => {
      expect(() => RawPassword.create("1234567")).toThrow(InvalidArgumentError);
    });

    it("should_allow_password_at_exact_minimum_length", () => {
      const password = RawPassword.create("12345678");
      expect(password.getValue()).toBe("12345678");
    });
  });
});
