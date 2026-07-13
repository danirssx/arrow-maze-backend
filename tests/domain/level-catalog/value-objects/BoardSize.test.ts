import {
  BOARD_SIZE_MAX_COLS,
  BOARD_SIZE_MAX_DEPTH,
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

  // --- @s1: create 3D BoardSize and read all accessors ---

  it("should_create_3d_board_size_and_expose_depth_accessor", () => {
    const size = BoardSize.create(3, 4, 2);

    expect(size.rows).toBe(3);
    expect(size.cols).toBe(4);
    expect(size.depth).toBe(2);
  });

  // --- @s2: toCells enumerates all z-planes in z-outer row-middle col-inner order ---

  it("should_return_cells_across_all_z_planes_in_z_outer_row_middle_col_inner_order", () => {
    const cells = BoardSize.create(2, 2, 2).toCells();

    expect(cells.map((c) => ({ z: c.z, row: c.row, col: c.col }))).toEqual([
      { z: 0, row: 0, col: 0 },
      { z: 0, row: 0, col: 1 },
      { z: 0, row: 1, col: 0 },
      { z: 0, row: 1, col: 1 },
      { z: 1, row: 0, col: 0 },
      { z: 1, row: 0, col: 1 },
      { z: 1, row: 1, col: 0 },
      { z: 1, row: 1, col: 1 },
    ]);
  });

  // --- @s3: reject invalid depth ---

  it("should_throw_when_depth_is_zero_or_negative_or_non_integer", () => {
    expect(() => BoardSize.create(3, 3, 0)).toThrow("positive integers");
    expect(() => BoardSize.create(3, 3, -1)).toThrow("positive integers");
    expect(() => BoardSize.create(3, 3, 1.5)).toThrow("positive integers");
  });

  // --- @s4: reject depth > BOARD_SIZE_MAX_DEPTH ---

  it("should_throw_when_depth_exceeds_max", () => {
    expect(() => BoardSize.create(3, 3, BOARD_SIZE_MAX_DEPTH + 1)).toThrow("must not exceed");
  });

  // --- @s5: backward compat — create(rows, cols) defaults depth to 1 ---

  it("should_default_depth_to_1_and_return_z0_cells_when_depth_is_omitted", () => {
    const size = BoardSize.create(2, 2);

    expect(size.depth).toBe(1);
    expect(size.toCells().every((c) => c.z === 0)).toBe(true);
  });
});
