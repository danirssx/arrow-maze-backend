import { InvalidArgumentError } from "../../errors/DomainError.js";
import { CellType } from "../enums/CellType.js";
import type { BoardSize } from "./BoardSize.js";
import type { CellSpec } from "./CellSpec.js";

export class LevelDefinition {
  private constructor(
    private readonly _boardSize: BoardSize,
    private readonly _cells: readonly CellSpec[]
  ) {}

  static create(boardSize: BoardSize, cells: CellSpec[]): LevelDefinition {
    const starts = cells.filter((c) => c.type === CellType.START);
    if (starts.length !== 1) {
      throw new InvalidArgumentError(
        `Level definition must have exactly one START cell, got ${starts.length}`
      );
    }

    const exits = cells.filter((c) => c.type === CellType.EXIT);
    if (exits.length !== 1) {
      throw new InvalidArgumentError(
        `Level definition must have exactly one EXIT cell, got ${exits.length}`
      );
    }

    const seen = new Set<string>();
    for (const cell of cells) {
      if (
        cell.position.row >= boardSize.rows ||
        cell.position.col >= boardSize.cols
      ) {
        throw new InvalidArgumentError(
          `Cell at (${cell.position.row}, ${cell.position.col}) is out of bounds ` +
            `for board ${boardSize.rows}x${boardSize.cols}`
        );
      }
      const key = `${cell.position.row},${cell.position.col}`;
      if (seen.has(key)) {
        throw new InvalidArgumentError(
          `Duplicate cell at position (${cell.position.row}, ${cell.position.col})`
        );
      }
      seen.add(key);
    }

    return new LevelDefinition(boardSize, [...cells]);
  }

  get boardSize(): BoardSize {
    return this._boardSize;
  }

  get cells(): readonly CellSpec[] {
    return this._cells;
  }
}
