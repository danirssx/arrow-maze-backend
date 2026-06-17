import { InvalidArgumentError } from "../../errors/DomainError.js";

const MIN_DIMENSION = 2;
const MAX_DIMENSION = 20;

export class BoardSize {
  private constructor(
    private readonly _rows: number,
    private readonly _cols: number
  ) {}

  static create(rows: number, cols: number): BoardSize {
    if (!Number.isInteger(rows) || rows < MIN_DIMENSION || rows > MAX_DIMENSION) {
      throw new InvalidArgumentError(
        `Board rows must be an integer between ${MIN_DIMENSION} and ${MAX_DIMENSION}`
      );
    }
    if (!Number.isInteger(cols) || cols < MIN_DIMENSION || cols > MAX_DIMENSION) {
      throw new InvalidArgumentError(
        `Board columns must be an integer between ${MIN_DIMENSION} and ${MAX_DIMENSION}`
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

  equals(other: BoardSize): boolean {
    return this._rows === other._rows && this._cols === other._cols;
  }
}
