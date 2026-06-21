// Pattern: Value Object
import { InvalidArgumentError } from "../../errors/DomainError.js";
import type { Position } from "./Position.js";

/** Only supported board-shape type for the MVP. */
export const CELL_MASK = "CELL_MASK";
export type BoardShapeType = typeof CELL_MASK;

/** Upper bound on mask cells to protect mobile rendering and API payload size. */
export const BOARD_SHAPE_MAX_CELLS = 600;

/**
 * BoardShape value object (immutable) — Option A.
 *
 * An optional finite cell mask that frames the visible board and constrains where
 * arrows may be placed. It is a VISUAL + authoring/placement mask, NOT a physical
 * wall: extraction physics (the unbounded raycast in `LevelSolvabilityPolicy` and
 * collision) ignore it. Invariants enforced here: a non-empty, duplicate-free set
 * of integer lattice cells, capped at `BOARD_SHAPE_MAX_CELLS`. Connectivity is
 * intentionally NOT enforced so abstract disconnected islands remain authorable.
 * The cross-object rule "every arrow cell lies inside the mask" is enforced by the
 * `Level` aggregate, which is the only place that knows both the arrows and the shape.
 */
export class BoardShape {
  private readonly _keys: Set<string>;

  private constructor(private readonly _cells: readonly Position[]) {
    this._keys = new Set(_cells.map((cell) => cell.toKey()));
  }

  /** Build from an external/untrusted type string, validating the type. */
  static create(type: string, cells: Position[]): BoardShape {
    if (type !== CELL_MASK) {
      throw new InvalidArgumentError(`Unsupported board shape type: ${type}`);
    }
    return BoardShape.cellMask(cells);
  }

  /** Canonical factory for the only supported shape type. */
  static cellMask(cells: Position[]): BoardShape {
    if (cells.length === 0) {
      throw new InvalidArgumentError("Board shape must contain at least one cell");
    }
    if (cells.length > BOARD_SHAPE_MAX_CELLS) {
      throw new InvalidArgumentError(
        `Board shape must not exceed ${BOARD_SHAPE_MAX_CELLS} cells`
      );
    }

    const seen = new Set<string>();
    for (const cell of cells) {
      const key = cell.toKey();
      if (seen.has(key)) {
        throw new InvalidArgumentError(`Duplicate board shape cell: ${key}`);
      }
      seen.add(key);
    }

    return new BoardShape([...cells]);
  }

  get type(): BoardShapeType {
    return CELL_MASK;
  }

  get cells(): readonly Position[] {
    return this._cells;
  }

  get size(): number {
    return this._cells.length;
  }

  contains(position: Position): boolean {
    return this._keys.has(position.toKey());
  }

  containsAll(positions: readonly Position[]): boolean {
    return positions.every((position) => this.contains(position));
  }
}
