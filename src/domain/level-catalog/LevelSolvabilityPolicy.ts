import { CellType } from "./enums/CellType.js";
import { Direction } from "./enums/Direction.js";
import type { LevelDefinition } from "./value-objects/LevelDefinition.js";
import { Position } from "./value-objects/Position.js";

const DIRECTION_DELTAS: Record<Direction, [number, number]> = {
  [Direction.UP]: [-1, 0],
  [Direction.DOWN]: [1, 0],
  [Direction.LEFT]: [0, -1],
  [Direction.RIGHT]: [0, 1],
  [Direction.UP_LEFT]: [-1, -1],
  [Direction.UP_RIGHT]: [-1, 1],
  [Direction.DOWN_LEFT]: [1, -1],
  [Direction.DOWN_RIGHT]: [1, 1],
};

function positionKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

function step(
  pos: Position,
  dir: Direction,
  rows: number,
  cols: number
): Position | null {
  const [dr, dc] = DIRECTION_DELTAS[dir];
  const newRow = pos.row + dr;
  const newCol = pos.col + dc;
  if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
    return null;
  }
  return Position.create(newRow, newCol);
}

export class LevelSolvabilityPolicy {
  isSolvable(definition: LevelDefinition): boolean {
    const { cells, boardSize } = definition;
    const cellMap = new Map(cells.map((c) => [positionKey(c.position), c]));

    const startCell = cells.find((c) => c.type === CellType.START);
    if (!startCell) return false;

    const visited = new Set<string>();
    let current: Position = startCell.position;

    while (true) {
      const key = positionKey(current);
      if (visited.has(key)) return false;
      visited.add(key);

      const cell = cellMap.get(key);
      if (!cell) return false;
      if (cell.type === CellType.EXIT) return true;
      if (!cell.direction) return false;

      const next = step(current, cell.direction, boardSize.rows, boardSize.cols);
      if (!next) return false;

      current = next;
    }
  }
}
