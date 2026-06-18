import { CellSpec } from "../../../../src/domain/level-catalog/value-objects/CellSpec";
import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";
import { CellType } from "../../../../src/domain/level-catalog/enums/CellType";
import { Direction } from "../../../../src/domain/level-catalog/enums/Direction";

const pos = () => Position.create(0, 0);

describe("CellSpec", () => {
  it("should_create_arrow_cell_with_direction", () => {
    const cell = CellSpec.create(pos(), CellType.ARROW, Direction.RIGHT);
    expect(cell.type).toBe(CellType.ARROW);
    expect(cell.direction).toBe(Direction.RIGHT);
  });

  it("should_create_start_cell_with_direction", () => {
    const cell = CellSpec.create(pos(), CellType.START, Direction.DOWN);
    expect(cell.type).toBe(CellType.START);
    expect(cell.direction).toBe(Direction.DOWN);
  });

  it("should_create_exit_cell_without_direction", () => {
    const cell = CellSpec.create(pos(), CellType.EXIT);
    expect(cell.type).toBe(CellType.EXIT);
    expect(cell.direction).toBeUndefined();
  });

  it("should_throw_when_arrow_cell_has_no_direction", () => {
    expect(() => CellSpec.create(pos(), CellType.ARROW)).toThrow();
  });

  it("should_throw_when_start_cell_has_no_direction", () => {
    expect(() => CellSpec.create(pos(), CellType.START)).toThrow();
  });

  it("should_throw_when_exit_cell_has_direction", () => {
    expect(() => CellSpec.create(pos(), CellType.EXIT, Direction.UP)).toThrow();
  });
});
