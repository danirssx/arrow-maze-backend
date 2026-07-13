import { InvalidArgumentError } from "../../errors/DomainError.js";

/**
 * Position value object (immutable).
 *
 * An integer `row`/`col`/`z` lattice coordinate on an UNBOUNDED 3D board. `z` is
 * the depth axis and defaults to `0`, so a planar (2D) level is simply the
 * `z = 0` slab and every existing 2D call site keeps working unchanged. The
 * occupancy/mask keys derive from `toKey`, so they become 3D automatically.
 */
export class Position {
  private constructor(
    private readonly _row: number,
    private readonly _col: number,
    private readonly _z: number
  ) {}

  static create(row: number, col: number, z = 0): Position {
    if (!Number.isInteger(row)) {
      throw new InvalidArgumentError("Position row must be an integer");
    }
    if (!Number.isInteger(col)) {
      throw new InvalidArgumentError("Position column must be an integer");
    }
    if (!Number.isInteger(z)) {
      throw new InvalidArgumentError("Position depth must be an integer");
    }
    return new Position(row, col, z);
  }

  get row(): number {
    return this._row;
  }

  get col(): number {
    return this._col;
  }

  get z(): number {
    return this._z;
  }

  equals(other: Position): boolean {
    return this._row === other._row && this._col === other._col && this._z === other._z;
  }

  translate(rowDelta: number, colDelta: number, zDelta = 0): Position {
    return Position.create(this._row + rowDelta, this._col + colDelta, this._z + zDelta);
  }

  toKey(): string {
    return `${this._row},${this._col},${this._z}`;
  }
}
