import { InvalidArgumentError } from "../../../../src/domain/errors/DomainError";
import {
  BoardShape,
  BOARD_SHAPE_MAX_CELLS,
} from "../../../../src/domain/level-catalog/value-objects/BoardShape";
import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";

const cells = (...c: [number, number][]) =>
  c.map(([row, col]) => Position.create(row, col));

const cells3d = (...c: [number, number, number][]) =>
  c.map(([row, col, z]) => Position.create(row, col, z));

describe("BoardShape", () => {
  it("should_create_a_cell_mask_when_cells_are_valid", () => {
    const shape = BoardShape.cellMask(cells([0, 0], [0, 1], [1, 0]));

    expect(shape.type).toBe("CELL_MASK");
    expect(shape.size).toBe(3);
    expect(shape.cells).toHaveLength(3);
  });

  it("should_report_membership_via_contains", () => {
    const shape = BoardShape.cellMask(cells([0, 0], [0, 1]));

    expect(shape.contains(Position.create(0, 1))).toBe(true);
    expect(shape.contains(Position.create(5, 5))).toBe(false);
  });

  it("should_report_containsAll_for_a_set_of_cells", () => {
    const shape = BoardShape.cellMask(cells([0, 0], [0, 1], [0, 2]));

    expect(shape.containsAll(cells([0, 0], [0, 2]))).toBe(true);
    expect(shape.containsAll(cells([0, 0], [9, 9]))).toBe(false);
  });

  it("should_allow_negative_coordinates", () => {
    const shape = BoardShape.cellMask(cells([-2, -3]));

    expect(shape.contains(Position.create(-2, -3))).toBe(true);
  });

  it("should_throw_when_cells_are_empty", () => {
    expect(() => BoardShape.cellMask([])).toThrow(InvalidArgumentError);
  });

  it("should_throw_when_cells_contain_duplicates", () => {
    expect(() => BoardShape.cellMask(cells([0, 0], [0, 0]))).toThrow("Duplicate");
  });

  it("should_allow_exactly_the_maximum_number_of_cells", () => {
    const exactlyMax = Array.from({ length: BOARD_SHAPE_MAX_CELLS }, (_, i) =>
      Position.create(0, i)
    );

    expect(BoardShape.cellMask(exactlyMax).size).toBe(BOARD_SHAPE_MAX_CELLS);
  });

  it("should_throw_when_cells_exceed_the_maximum", () => {
    const tooMany = Array.from({ length: BOARD_SHAPE_MAX_CELLS + 1 }, (_, i) =>
      Position.create(0, i)
    );

    expect(() => BoardShape.cellMask(tooMany)).toThrow(InvalidArgumentError);
  });

  it("should_create_via_create_with_an_explicit_type", () => {
    const shape = BoardShape.create("CELL_MASK", cells([0, 0]));

    expect(shape.type).toBe("CELL_MASK");
  });

  it("should_throw_when_type_is_unsupported", () => {
    expect(() => BoardShape.create("HEXAGON", cells([0, 0]))).toThrow(
      InvalidArgumentError
    );
  });

  // --- @s6: contains returns false for same row/col but different z ---

  it("should_return_false_when_position_has_same_row_col_but_different_z", () => {
    const shape = BoardShape.cellMask(cells3d([0, 0, 0]));

    expect(shape.contains(Position.create(0, 0, 1))).toBe(false);
  });

  // --- @s7: contains returns true for a 3D position present in the shape ---

  it("should_return_true_when_3d_position_is_in_the_shape", () => {
    const shape = BoardShape.cellMask(cells3d([0, 0, 1]));

    expect(shape.contains(Position.create(0, 0, 1))).toBe(true);
  });

  // --- @s8: Position(0,0,0) and Position(0,0,1) are distinct cells ---

  it("should_treat_same_row_col_different_z_as_distinct_cells", () => {
    const shape = BoardShape.cellMask(cells3d([0, 0, 0], [0, 0, 1]));

    expect(shape.size).toBe(2);
  });

  // --- @s9: exact 3D duplicate throws ---

  it("should_throw_when_exact_3d_duplicate_is_present", () => {
    expect(() => BoardShape.cellMask(cells3d([0, 0, 1], [0, 0, 1]))).toThrow("Duplicate");
  });
});
