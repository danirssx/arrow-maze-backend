import { Direction } from "../../../../src/domain/level-catalog/enums/Direction";
import { ArrowSpec } from "../../../../src/domain/level-catalog/value-objects/ArrowSpec";
import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";

const path2d = (...cells: [number, number][]) =>
  cells.map(([row, col]) => Position.create(row, col));

const path3d = (...cells: [number, number, number][]) =>
  cells.map(([row, col, z]) => Position.create(row, col, z));

describe("ArrowSpec", () => {
  // --- existing 2D tests (regression @s5) ---

  it("should_create_arrow_spec_when_path_is_valid", () => {
    const arrow = ArrowSpec.create("a", "#5262FB", path2d([0, 0], [0, 1]), Direction.RIGHT);

    expect(arrow.id).toBe("a");
    expect(arrow.head.equals(Position.create(0, 1))).toBe(true);
  });

  it("should_allow_negative_coordinates_when_path_is_valid", () => {
    const arrow = ArrowSpec.create("a", "#5262FB", path2d([-1, -2], [-1, -1]), Direction.RIGHT);

    expect(arrow.path[0]!.row).toBe(-1);
  });

  it("should_throw_when_path_is_not_orthogonally_connected", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path2d([0, 0], [0, 2]), Direction.RIGHT)
    ).toThrow("orthogonally connected");
  });

  it("should_throw_when_path_self_intersects", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path2d([0, 0], [0, 1], [0, 0]), Direction.RIGHT)
    ).toThrow("self-intersects");
  });

  it("should_throw_when_head_points_back_into_its_own_body", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path2d([0, 0], [0, 1]), Direction.LEFT)
    ).toThrow("points back");
  });

  // --- @s1: 3D path along z-axis ---

  it("should_create_arrow_spec_when_path_moves_along_z_axis_with_FORWARD", () => {
    const arrow = ArrowSpec.create(
      "a",
      "#5262FB",
      path3d([0, 0, 0], [0, 0, 1]),
      Direction.FORWARD,
    );

    expect(arrow.head.equals(Position.create(0, 0, 1))).toBe(true);
  });

  it("should_create_arrow_spec_when_path_moves_along_z_axis_with_BACK", () => {
    const arrow = ArrowSpec.create(
      "a",
      "#5262FB",
      path3d([0, 0, 1], [0, 0, 0]),
      Direction.BACK,
    );

    expect(arrow.head.equals(Position.create(0, 0, 0))).toBe(true);
  });

  // --- @s2: z-adjacent cells are orthogonally adjacent ---

  it("should_consider_z_adjacent_cells_orthogonally_adjacent", () => {
    const arrow = ArrowSpec.create(
      "a",
      "#5262FB",
      path3d([0, 0, 0], [0, 0, 1], [0, 0, 2]),
      Direction.FORWARD,
    );

    expect(arrow.path.length).toBe(3);
  });

  // --- @s3: diagonal in 3D is not adjacent ---

  it("should_throw_when_path_moves_diagonally_in_3d", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path3d([0, 0, 0], [1, 0, 1]), Direction.FORWARD)
    ).toThrow("orthogonally connected");
  });

  // --- @s4: points back along z-axis ---

  it("should_throw_when_head_points_back_along_z_axis_with_BACK", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path3d([0, 0, 0], [0, 0, 1]), Direction.BACK)
    ).toThrow("points back");
  });

  it("should_throw_when_head_points_back_along_z_axis_with_FORWARD", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path3d([0, 0, 1], [0, 0, 0]), Direction.FORWARD)
    ).toThrow("points back");
  });
});
