import { UserId } from "../../../../src/domain/shared/UserId.js";
import { DomainError, InvalidArgumentError } from "../../../../src/domain/errors/DomainError.js";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("UserId", () => {
  describe("create", () => {
    it("should_create_user_id_when_uuid_is_valid", () => {
      const id = UserId.create(VALID_UUID);
      expect(id.value).toBe(VALID_UUID);
    });

    it("should_throw_domain_error_when_value_is_empty", () => {
      expect(() => UserId.create("")).toThrow(DomainError);
    });

    it("should_throw_domain_error_when_format_is_not_uuid_v4", () => {
      expect(() => UserId.create("not-a-uuid")).toThrow(DomainError);
    });

    it("should_throw_invalid_argument_error_when_format_is_invalid", () => {
      expect(() => UserId.create("12345")).toThrow(InvalidArgumentError);
    });
  });

  describe("generate", () => {
    it("should_generate_valid_uuid_v4_when_called", () => {
      const id = UserId.generate();
      expect(id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should_generate_unique_ids_on_each_call", () => {
      const a = UserId.generate();
      const b = UserId.generate();
      expect(a.value).not.toBe(b.value);
    });
  });

  describe("equals", () => {
    it("should_return_true_when_both_ids_have_same_value", () => {
      const a = UserId.create(VALID_UUID);
      const b = UserId.create(VALID_UUID);
      expect(a.equals(b)).toBe(true);
    });

    it("should_return_false_when_ids_have_different_values", () => {
      const a = UserId.generate();
      const b = UserId.generate();
      expect(a.equals(b)).toBe(false);
    });
  });
});
