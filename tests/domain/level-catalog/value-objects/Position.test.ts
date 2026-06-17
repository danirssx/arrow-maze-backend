import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";

describe("Position", () => {
  it("should_create_when_coordinates_are_valid", () => {
    const pos = Position.create(2, 3);
    expect(pos.row).toBe(2);
    expect(pos.col).toBe(3);
  });

  it("should_accept_zero_coordinates", () => {
    const pos = Position.create(0, 0);
    expect(pos.row).toBe(0);
    expect(pos.col).toBe(0);
  });

  it("should_throw_when_row_is_negative", () => {
    expect(() => Position.create(-1, 0)).toThrow();
  });

  it("should_throw_when_col_is_not_integer", () => {
    expect(() => Position.create(0, 1.5)).toThrow();
  });
});
