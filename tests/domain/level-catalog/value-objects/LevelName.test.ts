import { LevelName } from "../../../../src/domain/level-catalog/value-objects/LevelName";

describe("LevelName", () => {
  it("should_create_when_name_is_valid", () => {
    const name = LevelName.create("Arrow Maze 1");
    expect(name.value).toBe("Arrow Maze 1");
  });

  it("should_trim_surrounding_whitespace", () => {
    const name = LevelName.create("  My Level  ");
    expect(name.value).toBe("My Level");
  });

  it("should_throw_when_name_is_empty", () => {
    expect(() => LevelName.create("")).toThrow();
  });

  it("should_throw_when_name_exceeds_max_length", () => {
    expect(() => LevelName.create("a".repeat(101))).toThrow();
  });
});
