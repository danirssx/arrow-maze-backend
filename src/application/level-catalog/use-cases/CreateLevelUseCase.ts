import { Level } from "../../../domain/level-catalog/Level.js";
import { CellType } from "../../../domain/level-catalog/enums/CellType.js";
import { Difficulty } from "../../../domain/level-catalog/enums/Difficulty.js";
import { Direction } from "../../../domain/level-catalog/enums/Direction.js";
import { BoardSize } from "../../../domain/level-catalog/value-objects/BoardSize.js";
import { CellSpec } from "../../../domain/level-catalog/value-objects/CellSpec.js";
import { LevelDefinition } from "../../../domain/level-catalog/value-objects/LevelDefinition.js";
import { LevelDescription } from "../../../domain/level-catalog/value-objects/LevelDescription.js";
import { LevelName } from "../../../domain/level-catalog/value-objects/LevelName.js";
import { LevelVersion } from "../../../domain/level-catalog/value-objects/LevelVersion.js";
import { MoveCount } from "../../../domain/level-catalog/value-objects/MoveCount.js";
import { Position } from "../../../domain/level-catalog/value-objects/Position.js";
import { TimeLimit } from "../../../domain/level-catalog/value-objects/TimeLimit.js";
import { LevelId } from "../../../domain/shared/LevelId.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";
import { parseEnumFromInput } from "../../../shared/parseEnum.js";

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
    const difficulty = parseEnumFromInput(Difficulty, input.difficulty, 'difficulty');
    const cells = input.cells.map((c) => {
      const cellType = parseEnumFromInput(CellType, c.type, 'cell type');
      const direction = c.direction !== undefined
        ? parseEnumFromInput(Direction, c.direction, 'direction')
        : undefined;
      return CellSpec.create(Position.create(c.position.row, c.position.col), cellType, direction);
    });
    const level = Level.draft(
      id,
      LevelName.create(input.name),
      LevelDescription.create(input.description),
      LevelDefinition.create(boardSize, cells),
      difficulty,
      LevelVersion.initial(),
      input.timeLimit ? TimeLimit.create(input.timeLimit) : undefined,
      input.moveCount ? MoveCount.create(input.moveCount) : undefined
    );

    await this.repo.save(level);
    return { levelId: id.value };
  }
}
