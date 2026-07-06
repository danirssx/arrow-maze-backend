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

  describe("equals", () => {
    it("should_return_true_when_both_ids_have_same_value", () => {
      const a = UserId.create(VALID_UUID);
      const b = UserId.create(VALID_UUID);
      expect(a.equals(b)).toBe(true);
    });

    it("should_return_false_when_ids_have_different_values", () => {
      const a = UserId.create(VALID_UUID);
      const b = UserId.create("550e8400-e29b-41d4-a716-446655440001");
      expect(a.equals(b)).toBe(false);
    });
  });
});
