// Pattern: Value Object
import { InvalidArgumentError } from "../../errors/DomainError.js";
import { Position } from "./Position.js";

export const BOARD_SIZE_MAX_ROWS = 12;
export const BOARD_SIZE_MAX_COLS = 12;

export class BoardSize {
  private constructor(
    private readonly _rows: number,
    private readonly _cols: number
  ) {}

  static create(rows: number, cols: number): BoardSize {
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
      throw new InvalidArgumentError("Board size rows and cols must be positive integers");
    }
    if (rows > BOARD_SIZE_MAX_ROWS || cols > BOARD_SIZE_MAX_COLS) {
      throw new InvalidArgumentError(
        `Board size must not exceed ${BOARD_SIZE_MAX_ROWS} rows by ${BOARD_SIZE_MAX_COLS} cols`
      );
    }

    return new BoardSize(rows, cols);
  }

  get rows(): number {
    return this._rows;
  }

  get cols(): number {
    return this._cols;
  }

  toCells(): Position[] {
    const cells: Position[] = [];
    for (let row = 0; row < this._rows; row += 1) {
      for (let col = 0; col < this._cols; col += 1) {
        cells.push(Position.create(row, col));
      }
    }
    return cells;
  }
}
