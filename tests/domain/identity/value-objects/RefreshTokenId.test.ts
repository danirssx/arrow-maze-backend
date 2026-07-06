import { RefreshTokenId } from "../../../../src/domain/identity/value-objects/RefreshTokenId.js";
import { DomainError, InvalidArgumentError } from "../../../../src/domain/errors/DomainError.js";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440010";

describe("RefreshTokenId", () => {
  it("should_create_refresh_token_id_when_uuid_is_valid", () => {
    expect(RefreshTokenId.create(VALID_UUID).value).toBe(VALID_UUID);
  });

  it("should_throw_invalid_argument_error_when_value_is_empty", () => {
    expect(() => RefreshTokenId.create("")).toThrow(InvalidArgumentError);
  });

  it("should_throw_domain_error_when_format_is_not_uuid", () => {
    expect(() => RefreshTokenId.create("not-a-uuid")).toThrow(DomainError);
  });

  it("should_throw_with_a_descriptive_message_when_format_is_invalid", () => {
    expect(() => RefreshTokenId.create("nope")).toThrow("Invalid refresh token ID format");
  });

  it("should_reject_a_uuid_with_a_leading_prefix", () => {
    expect(() => RefreshTokenId.create("x" + VALID_UUID)).toThrow(InvalidArgumentError);
  });

  it("should_reject_a_uuid_with_a_trailing_suffix", () => {
    expect(() => RefreshTokenId.create(VALID_UUID + "x")).toThrow(InvalidArgumentError);
  });

  it("should_expose_its_value_via_toString", () => {
    expect(RefreshTokenId.create(VALID_UUID).toString()).toBe(VALID_UUID);
  });

  it("should_return_true_when_ids_have_same_value", () => {
    expect(RefreshTokenId.create(VALID_UUID).equals(RefreshTokenId.create(VALID_UUID))).toBe(true);
  });

  it("should_return_false_when_ids_have_different_values", () => {
    const other = "550e8400-e29b-41d4-a716-446655440011";
    expect(RefreshTokenId.create(VALID_UUID).equals(RefreshTokenId.create(other))).toBe(false);
  });
});
