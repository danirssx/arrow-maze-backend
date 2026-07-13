// Pattern: Value Object
import { InvalidArgumentError } from "../../errors/DomainError.js";
import { Position } from "./Position.js";

export const BOARD_SIZE_MAX_ROWS = 12;
export const BOARD_SIZE_MAX_COLS = 12;
export const BOARD_SIZE_MAX_DEPTH = 6;

export class BoardSize {
  private constructor(
    private readonly _rows: number,
    private readonly _cols: number,
    private readonly _depth: number
  ) {}

  static create(rows: number, cols: number, depth = 1): BoardSize {
    if (
      !Number.isInteger(rows) || !Number.isInteger(cols) || !Number.isInteger(depth) ||
      rows < 1 || cols < 1 || depth < 1
    ) {
      throw new InvalidArgumentError("Board size rows, cols and depth must be positive integers");
    }
    if (rows > BOARD_SIZE_MAX_ROWS || cols > BOARD_SIZE_MAX_COLS || depth > BOARD_SIZE_MAX_DEPTH) {
      throw new InvalidArgumentError(
        `Board size must not exceed ${BOARD_SIZE_MAX_ROWS} rows by ${BOARD_SIZE_MAX_COLS} cols by ${BOARD_SIZE_MAX_DEPTH} depth`
      );
    }

    return new BoardSize(rows, cols, depth);
  }

  get rows(): number {
    return this._rows;
  }

  get cols(): number {
    return this._cols;
  }

  get depth(): number {
    return this._depth;
  }

  toCells(): Position[] {
    const cells: Position[] = [];
    for (let z = 0; z < this._depth; z += 1) {
      for (let row = 0; row < this._rows; row += 1) {
        for (let col = 0; col < this._cols; col += 1) {
          cells.push(Position.create(row, col, z));
        }
      }
    }
    return cells;
  }
}
