import { Direction } from "../../../../src/domain/level-catalog/enums/Direction";
import { ArrowSpec } from "../../../../src/domain/level-catalog/value-objects/ArrowSpec";
import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";

const path = (...cells: [number, number][]) =>
  cells.map(([row, col]) => Position.create(row, col));

describe("ArrowSpec", () => {
  it("should_create_arrow_spec_when_path_is_valid", () => {
    const arrow = ArrowSpec.create("a", "#5262FB", path([0, 0], [0, 1]), Direction.RIGHT);

    expect(arrow.id).toBe("a");
    expect(arrow.head.equals(Position.create(0, 1))).toBe(true);
  });

  it("should_allow_negative_coordinates_when_path_is_valid", () => {
    const arrow = ArrowSpec.create("a", "#5262FB", path([-1, -2], [-1, -1]), Direction.RIGHT);

    expect(arrow.path[0]!.row).toBe(-1);
  });

  it("should_throw_when_path_is_not_orthogonally_connected", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path([0, 0], [0, 2]), Direction.RIGHT)
    ).toThrow("orthogonally connected");
  });

  it("should_throw_when_path_self_intersects", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path([0, 0], [0, 1], [0, 0]), Direction.RIGHT)
    ).toThrow("self-intersects");
  });

  it("should_throw_when_head_points_back_into_its_own_body", () => {
    expect(() =>
      ArrowSpec.create("a", "#5262FB", path([0, 0], [0, 1]), Direction.LEFT)
    ).toThrow("points back");
  });
});
