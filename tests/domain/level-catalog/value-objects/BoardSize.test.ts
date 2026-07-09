import {
  BOARD_SIZE_MAX_COLS,
  BOARD_SIZE_MAX_ROWS,
  BoardSize,
} from "../../../../src/domain/level-catalog/value-objects/BoardSize";

describe("BoardSize", () => {
  it("should_create_when_dimensions_are_within_m12_limits", () => {
    const size = BoardSize.create(12, 10);

    expect(size.rows).toBe(12);
    expect(size.cols).toBe(10);
  });

  it("should_throw_when_dimensions_exceed_m12_limits", () => {
    expect(() => BoardSize.create(BOARD_SIZE_MAX_ROWS + 1, 12)).toThrow("must not exceed");
    expect(() => BoardSize.create(12, BOARD_SIZE_MAX_COLS + 1)).toThrow("must not exceed");
  });

  it("should_throw_when_dimensions_are_not_positive_integers", () => {
    expect(() => BoardSize.create(0, 12)).toThrow("positive integers");
    expect(() => BoardSize.create(12, 1.5)).toThrow("positive integers");
  });

  it("should_return_cells_in_row_major_order_when_rectangle_is_created", () => {
    const cells = BoardSize.create(2, 3).toCells();

    expect(cells.map((cell) => ({ row: cell.row, col: cell.col }))).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]);
  });
});
