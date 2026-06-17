import { Email } from "../../../../src/domain/identity/value-objects/Email.js";
import { DomainError } from "../../../../src/domain/errors/DomainError.js";

describe("Email", () => {
  describe("create", () => {
    it("should_create_email_when_format_is_valid", () => {
      const email = Email.create("user@example.com");
      expect(email.getValue()).toBe("user@example.com");
    });

    it("should_normalize_email_to_lowercase_when_created", () => {
      const email = Email.create("USER@EXAMPLE.COM");
      expect(email.getValue()).toBe("user@example.com");
    });

    it("should_trim_whitespace_when_email_has_surrounding_spaces", () => {
      const email = Email.create("  user@example.com  ");
      expect(email.getValue()).toBe("user@example.com");
    });

    it("should_throw_domain_error_when_email_is_empty", () => {
      expect(() => Email.create("")).toThrow(DomainError);
    });

    it("should_throw_domain_error_when_email_has_no_at_symbol", () => {
      expect(() => Email.create("userexample.com")).toThrow(DomainError);
    });

    it("should_throw_domain_error_when_email_has_no_domain", () => {
      expect(() => Email.create("user@")).toThrow(DomainError);
    });

    it("should_throw_domain_error_with_correct_code_when_email_is_invalid", () => {
      expect(() => Email.create("not-an-email")).toThrow(
        expect.objectContaining({ code: "INVALID_EMAIL" })
      );
    });
  });

  describe("equals", () => {
    it("should_return_true_when_both_emails_have_same_value", () => {
      const a = Email.create("user@example.com");
      const b = Email.create("user@example.com");
      expect(a.equals(b)).toBe(true);
    });

    it("should_return_false_when_emails_have_different_values", () => {
      const a = Email.create("a@example.com");
      const b = Email.create("b@example.com");
      expect(a.equals(b)).toBe(false);
    });
  });
});
