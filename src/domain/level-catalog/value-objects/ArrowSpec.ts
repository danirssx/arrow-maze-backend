// Pattern: Value Object
import { InvalidArgumentError } from "../../errors/DomainError.js";
import { Direction } from "../enums/Direction.js";
import type { Position } from "./Position.js";

const DIRECTION_DELTAS: Record<Direction, readonly [number, number]> = {
  [Direction.UP]: [-1, 0],
  [Direction.DOWN]: [1, 0],
  [Direction.LEFT]: [0, -1],
  [Direction.RIGHT]: [0, 1],
};

export class ArrowSpec {
  private constructor(
    private readonly _id: string,
    private readonly _color: string,
    private readonly _path: readonly Position[],
    private readonly _direction: Direction
  ) {}

  static create(id: string, color: string, path: Position[], direction: Direction): ArrowSpec {
    if (id.trim().length === 0) {
      throw new InvalidArgumentError("ArrowSpec id must be non-empty");
    }
    if (color.trim().length === 0) {
      throw new InvalidArgumentError(`ArrowSpec ${id} color must be non-empty`);
    }
    if (path.length === 0) {
      throw new InvalidArgumentError(`ArrowSpec ${id} path must contain at least one position`);
    }

    const seen = new Set<string>();
    for (let index = 0; index < path.length; index += 1) {
      const cell = path[index]!;
      const key = cell.toKey();
      if (seen.has(key)) {
        throw new InvalidArgumentError(`ArrowSpec ${id} path self-intersects at ${key}`);
      }
      seen.add(key);

      if (index > 0 && !ArrowSpec.areOrthogonallyAdjacent(path[index - 1]!, cell)) {
        throw new InvalidArgumentError(
          `ArrowSpec ${id} path must be orthogonally connected`
        );
      }
    }

    if (path.length >= 2) {
      const head = path[path.length - 1]!;
      const penultimate = path[path.length - 2]!;
      const [rowDelta, colDelta] = DIRECTION_DELTAS[direction];
      if (head.translate(rowDelta, colDelta).equals(penultimate)) {
        throw new InvalidArgumentError(`ArrowSpec ${id} head points back into its own body`);
      }
    }

    return new ArrowSpec(id, color, [...path], direction);
  }

  get id(): string {
    return this._id;
  }

  get color(): string {
    return this._color;
  }

  get path(): readonly Position[] {
    return this._path;
  }

  get direction(): Direction {
    return this._direction;
  }

  get head(): Position {
    return this._path[this._path.length - 1]!;
  }

  private static areOrthogonallyAdjacent(a: Position, b: Position): boolean {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  }
}
