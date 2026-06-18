import { BoardSize } from "../../../../src/domain/level-catalog/value-objects/BoardSize";

describe("BoardSize", () => {
  it("should_create_when_dimensions_are_valid", () => {
    const size = BoardSize.create(4, 5);
    expect(size.rows).toBe(4);
    expect(size.cols).toBe(5);
  });

  it("should_throw_when_rows_is_less_than_2", () => {
    expect(() => BoardSize.create(1, 4)).toThrow();
  });

  it("should_throw_when_cols_is_less_than_2", () => {
    expect(() => BoardSize.create(4, 1)).toThrow();
  });

  it("should_throw_when_rows_exceeds_max", () => {
    expect(() => BoardSize.create(21, 4)).toThrow();
  });

  it("should_throw_when_rows_is_not_integer", () => {
    expect(() => BoardSize.create(2.5, 4)).toThrow();
  });
});
