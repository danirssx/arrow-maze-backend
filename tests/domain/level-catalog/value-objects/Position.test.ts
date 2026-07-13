import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";

describe("Position", () => {
  it("should_create_when_coordinates_are_valid", () => {
    const pos = Position.create(2, 3);
    expect(pos.row).toBe(2);
    expect(pos.col).toBe(3);
    expect(pos.z).toBe(0);
  });

  it("should_default_depth_to_zero_when_created_without_z", () => {
    expect(Position.create(2, 3).z).toBe(0);
  });

  it("should_store_explicit_depth_when_z_is_provided", () => {
    const pos = Position.create(2, 3, 4);
    expect(pos.row).toBe(2);
    expect(pos.col).toBe(3);
    expect(pos.z).toBe(4);
  });

  it("should_accept_zero_coordinates", () => {
    const pos = Position.create(0, 0);
    expect(pos.row).toBe(0);
    expect(pos.col).toBe(0);
    expect(pos.z).toBe(0);
  });

  it("should_accept_negative_coordinates", () => {
    const pos = Position.create(-1, -2, -3);
    expect(pos.row).toBe(-1);
    expect(pos.col).toBe(-2);
    expect(pos.z).toBe(-3);
  });

  it("should_throw_when_row_is_not_integer", () => {
    expect(() => Position.create(1.5, 0)).toThrow();
  });

  it("should_throw_when_col_is_not_integer", () => {
    expect(() => Position.create(0, 1.5)).toThrow();
  });

  it("should_throw_when_depth_is_not_integer", () => {
    expect(() => Position.create(0, 0, 1.5)).toThrow();
  });

  it("should_expose_a_three_component_key", () => {
    expect(Position.create(2, 3).toKey()).toBe("2,3,0");
    expect(Position.create(2, 3, 4).toKey()).toBe("2,3,4");
    expect(Position.create(-1, -2, -3).toKey()).toBe("-1,-2,-3");
  });

  it("should_be_value_equal_only_when_all_three_coordinates_match", () => {
    expect(Position.create(4, 5).equals(Position.create(4, 5))).toBe(true);
    expect(Position.create(4, 5, 1).equals(Position.create(4, 5, 1))).toBe(true);
    expect(Position.create(4, 5, 0).equals(Position.create(4, 5, 1))).toBe(false);
    expect(Position.create(4, 5).equals(Position.create(5, 4))).toBe(false);
  });

  it("should_translate_across_all_three_axes", () => {
    const moved = Position.create(1, 1, 1).translate(1, -1, 2);
    expect(moved.equals(Position.create(2, 0, 3))).toBe(true);
  });

  it("should_preserve_depth_when_translated_without_a_depth_delta", () => {
    const moved = Position.create(1, 1, 5).translate(1, 0);
    expect(moved.equals(Position.create(2, 1, 5))).toBe(true);
  });
});
