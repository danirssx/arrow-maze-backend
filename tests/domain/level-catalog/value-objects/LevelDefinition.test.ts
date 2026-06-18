import { LevelDefinition } from "../../../../src/domain/level-catalog/value-objects/LevelDefinition";
import { BoardSize } from "../../../../src/domain/level-catalog/value-objects/BoardSize";
import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";
import { CellSpec } from "../../../../src/domain/level-catalog/value-objects/CellSpec";
import { CellType } from "../../../../src/domain/level-catalog/enums/CellType";
import { Direction } from "../../../../src/domain/level-catalog/enums/Direction";

// Subject to human review — domain value object test

const size = () => BoardSize.create(3, 3);

const start = (row: number, col: number) =>
  CellSpec.create(Position.create(row, col), CellType.START, Direction.RIGHT);

const arrow = (row: number, col: number, dir: Direction) =>
  CellSpec.create(Position.create(row, col), CellType.ARROW, dir);

const exit = (row: number, col: number) =>
  CellSpec.create(Position.create(row, col), CellType.EXIT);

const validCells = () => [
  start(0, 0),
  arrow(0, 1, Direction.DOWN),
  exit(1, 1),
];

describe("LevelDefinition", () => {
  it("should_create_when_definition_is_valid", () => {
    const def = LevelDefinition.create(size(), validCells());
    expect(def.cells).toHaveLength(3);
    expect(def.boardSize.rows).toBe(3);
  });

  it("should_throw_when_definition_has_two_start_cells", () => {
    const cells = [...validCells(), start(2, 0)];
    expect(() => LevelDefinition.create(size(), cells)).toThrow(
      "exactly one START"
    );
  });

  it("should_throw_when_definition_has_no_start_cell", () => {
    const cells = [arrow(0, 0, Direction.RIGHT), exit(0, 1)];
    expect(() => LevelDefinition.create(size(), cells)).toThrow(
      "exactly one START"
    );
  });

  it("should_throw_when_definition_has_two_exit_cells", () => {
    const cells = [...validCells(), exit(2, 2)];
    expect(() => LevelDefinition.create(size(), cells)).toThrow(
      "exactly one EXIT"
    );
  });

  it("should_throw_when_definition_has_no_exit_cell", () => {
    const cells = [start(0, 0), arrow(0, 1, Direction.RIGHT)];
    expect(() => LevelDefinition.create(size(), cells)).toThrow(
      "exactly one EXIT"
    );
  });

  it("should_throw_when_cell_is_out_of_bounds", () => {
    const cells = [start(0, 0), exit(0, 1), arrow(5, 5, Direction.UP)];
    expect(() => LevelDefinition.create(size(), cells)).toThrow("out of bounds");
  });

  it("should_throw_when_two_cells_share_the_same_position", () => {
    const cells = [start(0, 0), arrow(0, 1, Direction.DOWN), exit(0, 1)];
    expect(() => LevelDefinition.create(size(), cells)).toThrow("Duplicate cell");
  });
});
