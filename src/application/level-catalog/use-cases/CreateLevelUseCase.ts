import { Level } from "../../../domain/level-catalog/Level.js";
import type { CellType } from "../../../domain/level-catalog/enums/CellType.js";
import type { Difficulty } from "../../../domain/level-catalog/enums/Difficulty.js";
import type { Direction } from "../../../domain/level-catalog/enums/Direction.js";
import { BoardSize } from "../../../domain/level-catalog/value-objects/BoardSize.js";
import { CellSpec } from "../../../domain/level-catalog/value-objects/CellSpec.js";
import { LevelDefinition } from "../../../domain/level-catalog/value-objects/LevelDefinition.js";
import { LevelDescription } from "../../../domain/level-catalog/value-objects/LevelDescription.js";
import { LevelId } from "../../../domain/level-catalog/value-objects/LevelId.js";
import { LevelName } from "../../../domain/level-catalog/value-objects/LevelName.js";
import { LevelVersion } from "../../../domain/level-catalog/value-objects/LevelVersion.js";
import { MoveCount } from "../../../domain/level-catalog/value-objects/MoveCount.js";
import { Position } from "../../../domain/level-catalog/value-objects/Position.js";
import { TimeLimit } from "../../../domain/level-catalog/value-objects/TimeLimit.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";

export type CellInput = {
  position: { row: number; col: number };
  type: string;
  direction?: string;
};

export type CreateLevelInput = {
  name: string;
  description: string;
  difficulty: string;
  boardSize: { rows: number; cols: number };
  cells: CellInput[];
  timeLimit?: number;
  moveCount?: number;
};

export type CreateLevelOutput = { levelId: string };

export class CreateLevelUseCase implements UseCase<CreateLevelInput, CreateLevelOutput> {
  constructor(private readonly repo: LevelRepository) {}

  async execute(input: CreateLevelInput): Promise<CreateLevelOutput> {
    const id = LevelId.generate();
    const boardSize = BoardSize.create(input.boardSize.rows, input.boardSize.cols);
    const cells = input.cells.map((c) =>
      CellSpec.create(
        Position.create(c.position.row, c.position.col),
        c.type as CellType,
        c.direction as Direction | undefined
      )
    );
    const level = Level.draft(
      id,
      LevelName.create(input.name),
      LevelDescription.create(input.description),
      LevelDefinition.create(boardSize, cells),
      input.difficulty as Difficulty,
      LevelVersion.initial(),
      input.timeLimit ? TimeLimit.create(input.timeLimit) : undefined,
      input.moveCount ? MoveCount.create(input.moveCount) : undefined
    );

    await this.repo.save(level);
    return { levelId: id.getValue() };
  }
}
