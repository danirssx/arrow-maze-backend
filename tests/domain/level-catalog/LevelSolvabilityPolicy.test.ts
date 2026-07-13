import { Direction } from "../../../src/domain/level-catalog/enums/Direction";
import { LevelSolvabilityPolicy } from "../../../src/domain/level-catalog/LevelSolvabilityPolicy";
import { ArrowSpec } from "../../../src/domain/level-catalog/value-objects/ArrowSpec";
import { LevelDefinition } from "../../../src/domain/level-catalog/value-objects/LevelDefinition";
import { Position } from "../../../src/domain/level-catalog/value-objects/Position";

const policy = new LevelSolvabilityPolicy();

const arrow = (id: string, cells: [number, number][], direction: Direction) =>
  ArrowSpec.create(id, "#5262FB", cells.map(([row, col]) => Position.create(row, col)), direction);

const arrow3d = (id: string, cells: [number, number, number][], direction: Direction) =>
  ArrowSpec.create(id, "#5262FB", cells.map(([row, col, z]) => Position.create(row, col, z)), direction);

describe("LevelSolvabilityPolicy", () => {
  it("should_accept_a_dag_blocking_graph", () => {
    const def = LevelDefinition.create([
      arrow("a", [[0, 0], [0, 1]], Direction.RIGHT),
      arrow("b", [[-1, 2], [0, 2], [1, 2]], Direction.DOWN),
      arrow("c", [[2, 0]], Direction.UP),
    ]);

    expect(policy.isSolvable(def)).toBe(true);
  });

  it("should_reject_a_circular_blocking_graph", () => {
    const def = LevelDefinition.create([
      arrow("a", [[0, 0]], Direction.RIGHT),
      arrow("b", [[0, 2]], Direction.LEFT),
    ]);

    expect(policy.isSolvable(def)).toBe(false);
  });

  it("should_ignore_the_arrow_own_body_when_building_blockers", () => {
    const def = LevelDefinition.create([
      arrow("a", [[0, 0], [0, 1], [1, 1]], Direction.RIGHT),
    ]);

    expect(policy.isSolvable(def)).toBe(true);
  });

  it("should_accept_a_dag_with_forward_arrow_unblocked_on_z_axis", () => {
    const def = LevelDefinition.create([
      arrow3d("a", [[0, 0, 0]], Direction.FORWARD),
      arrow3d("b", [[0, 0, 2]], Direction.FORWARD),
    ]);

    expect(policy.isSolvable(def)).toBe(true);
  });

  it("should_reject_a_cycle_between_forward_and_back_arrows_on_z_axis", () => {
    const def = LevelDefinition.create([
      arrow3d("a", [[0, 0, 0]], Direction.FORWARD),
      arrow3d("b", [[0, 0, 1]], Direction.BACK),
    ]);

    expect(policy.isSolvable(def)).toBe(false);
  });

  it("should_not_block_forward_arrow_when_blocker_is_at_same_z", () => {
    const def = LevelDefinition.create([
      arrow3d("a", [[0, 0, 1]], Direction.FORWARD),
      arrow3d("b", [[0, 0, 1], [0, 0, 2]], Direction.FORWARD),
    ]);

    expect(policy.isSolvable(def)).toBe(true);
  });

  it("should_not_block_forward_arrow_when_blocker_has_different_row", () => {
    const def = LevelDefinition.create([
      arrow3d("a", [[0, 0, 0]], Direction.FORWARD),
      arrow3d("b", [[1, 0, 1]], Direction.DOWN),
    ]);

    expect(policy.isSolvable(def)).toBe(true);
  });

  it("should_not_block_back_arrow_when_blocker_is_at_same_z", () => {
    const def = LevelDefinition.create([
      arrow3d("a", [[0, 0, 1]], Direction.BACK),
      arrow3d("b", [[0, 0, 1], [0, 0, 2]], Direction.FORWARD),
    ]);

    expect(policy.isSolvable(def)).toBe(true);
  });
});
