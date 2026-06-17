import { LevelId } from "../../../../src/domain/level-catalog/value-objects/LevelId";
import { InvalidArgumentError } from "../../../../src/domain/errors/DomainError";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("LevelId", () => {
  it("should_create_when_uuid_is_valid", () => {
    const id = LevelId.create(VALID_UUID);
    expect(id.getValue()).toBe(VALID_UUID);
  });

  it("should_throw_when_uuid_format_is_invalid", () => {
    expect(() => LevelId.create("not-a-uuid")).toThrow();
  });

  it("should_throw_when_value_is_empty", () => {
    expect(() => LevelId.create("")).toThrow();
  });

  it("should_generate_a_valid_uuid", () => {
    const id = LevelId.generate();
    expect(id.getValue()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("should_throw_invalid_argument_error_when_uuid_is_invalid", () => {
    expect(() => LevelId.create("bad")).toThrow(InvalidArgumentError);
  });
});
