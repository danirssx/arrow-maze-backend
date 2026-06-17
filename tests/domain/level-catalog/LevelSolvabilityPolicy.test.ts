import { LevelSolvabilityPolicy } from "../../../src/domain/level-catalog/LevelSolvabilityPolicy";
import { LevelDefinition } from "../../../src/domain/level-catalog/value-objects/LevelDefinition";
import { BoardSize } from "../../../src/domain/level-catalog/value-objects/BoardSize";
import { Position } from "../../../src/domain/level-catalog/value-objects/Position";
import { CellSpec } from "../../../src/domain/level-catalog/value-objects/CellSpec";
import { CellType } from "../../../src/domain/level-catalog/enums/CellType";
import { Direction } from "../../../src/domain/level-catalog/enums/Direction";

// Subject to human review — domain policy test

const size = BoardSize.create(3, 3);
const policy = new LevelSolvabilityPolicy();

const start = (r: number, c: number, dir: Direction) =>
  CellSpec.create(Position.create(r, c), CellType.START, dir);

const arrow = (r: number, c: number, dir: Direction) =>
  CellSpec.create(Position.create(r, c), CellType.ARROW, dir);

const exit = (r: number, c: number) =>
  CellSpec.create(Position.create(r, c), CellType.EXIT);

describe("LevelSolvabilityPolicy", () => {
  it("should_return_true_when_path_exists_from_start_to_exit", () => {
    // START(0,0)→RIGHT→ ARROW(0,1)→DOWN→ EXIT(1,1)
    const def = LevelDefinition.create(size, [
      start(0, 0, Direction.RIGHT),
      arrow(0, 1, Direction.DOWN),
      exit(1, 1),
    ]);
    expect(policy.isSolvable(def)).toBe(true);
  });

  it("should_return_true_when_path_uses_diagonal_direction", () => {
    // START(0,0)→DOWN_RIGHT→ EXIT(1,1)
    const def = LevelDefinition.create(size, [
      start(0, 0, Direction.DOWN_RIGHT),
      exit(1, 1),
    ]);
    expect(policy.isSolvable(def)).toBe(true);
  });

  it("should_return_false_when_arrow_points_out_of_bounds", () => {
    // START(0,0)→UP → out of bounds
    const def = LevelDefinition.create(size, [
      start(0, 0, Direction.UP),
      exit(2, 2),
    ]);
    expect(policy.isSolvable(def)).toBe(false);
  });

  it("should_return_false_when_path_leads_to_undefined_cell", () => {
    // START(0,0)→RIGHT→ position (0,1) has no cell defined
    const def = LevelDefinition.create(size, [
      start(0, 0, Direction.RIGHT),
      exit(2, 2),
    ]);
    expect(policy.isSolvable(def)).toBe(false);
  });

  it("should_return_false_when_path_forms_a_cycle", () => {
    // START(0,0)→RIGHT→ ARROW(0,1)→LEFT→ (0,0) again → cycle
    const def = LevelDefinition.create(size, [
      start(0, 0, Direction.RIGHT),
      arrow(0, 1, Direction.LEFT),
      exit(2, 2),
    ]);
    expect(policy.isSolvable(def)).toBe(false);
  });
});
