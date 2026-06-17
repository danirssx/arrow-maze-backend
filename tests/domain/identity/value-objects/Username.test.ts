import { Username } from "../../../../src/domain/identity/value-objects/Username.js";
import { DomainError } from "../../../../src/domain/errors/DomainError.js";

describe("Username", () => {
  describe("create", () => {
    it("should_create_username_when_value_is_valid", () => {
      const username = Username.create("player_1");
      expect(username.getValue()).toBe("player_1");
    });

    it("should_throw_domain_error_when_username_is_too_short", () => {
      expect(() => Username.create("ab")).toThrow(DomainError);
    });

    it("should_throw_domain_error_when_username_is_too_long", () => {
      expect(() => Username.create("a".repeat(31))).toThrow(DomainError);
    });

    it("should_throw_domain_error_when_username_has_special_characters", () => {
      expect(() => Username.create("user name!")).toThrow(DomainError);
    });

    it("should_throw_domain_error_with_length_code_when_too_short", () => {
      expect(() => Username.create("ab")).toThrow(
        expect.objectContaining({ code: "INVALID_USERNAME_LENGTH" })
      );
    });

    it("should_throw_domain_error_with_format_code_when_characters_are_invalid", () => {
      expect(() => Username.create("bad-name!")).toThrow(
        expect.objectContaining({ code: "INVALID_USERNAME_FORMAT" })
      );
    });

    it("should_allow_username_at_minimum_length", () => {
      const username = Username.create("abc");
      expect(username.getValue()).toBe("abc");
    });

    it("should_allow_username_at_maximum_length", () => {
      const value = "a".repeat(30);
      const username = Username.create(value);
      expect(username.getValue()).toBe(value);
    });
  });

  describe("equals", () => {
    it("should_return_true_when_both_usernames_have_same_value", () => {
      const a = Username.create("player1");
      const b = Username.create("player1");
      expect(a.equals(b)).toBe(true);
    });

    it("should_return_false_when_usernames_have_different_values", () => {
      const a = Username.create("player1");
      const b = Username.create("player2");
      expect(a.equals(b)).toBe(false);
    });
  });
});
