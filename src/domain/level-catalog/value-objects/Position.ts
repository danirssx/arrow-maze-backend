import { InvalidArgumentError } from "../../errors/DomainError.js";

export class Position {
  private constructor(
    private readonly _row: number,
    private readonly _col: number
  ) {}

  static create(row: number, col: number): Position {
    if (!Number.isInteger(row)) {
      throw new InvalidArgumentError("Position row must be an integer");
    }
    if (!Number.isInteger(col)) {
      throw new InvalidArgumentError("Position column must be an integer");
    }
    return new Position(row, col);
  }

  get row(): number {
    return this._row;
  }

  get col(): number {
    return this._col;
  }

  equals(other: Position): boolean {
    return this._row === other._row && this._col === other._col;
  }

  translate(rowDelta: number, colDelta: number): Position {
    return Position.create(this._row + rowDelta, this._col + colDelta);
  }

  toKey(): string {
    return `${this._row},${this._col}`;
  }
}
