import type { CellType } from "../../../domain/level-catalog/enums/CellType.js";
import type { Direction } from "../../../domain/level-catalog/enums/Direction.js";
import { BoardSize } from "../../../domain/level-catalog/value-objects/BoardSize.js";
import { CellSpec } from "../../../domain/level-catalog/value-objects/CellSpec.js";
import { LevelDefinition } from "../../../domain/level-catalog/value-objects/LevelDefinition.js";
import { Position } from "../../../domain/level-catalog/value-objects/Position.js";
import { LevelId } from "../../../domain/shared/LevelId.js";
import { NotFoundError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";
import type { CellInput } from "./CreateLevelUseCase.js";

export type UpdateLevelDefinitionInput = {
  levelId: string;
  boardSize: { rows: number; cols: number };
  cells: CellInput[];
};

export type UpdateLevelDefinitionOutput = { levelId: string };

export class UpdateLevelDefinitionUseCase
  implements UseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput>
{
  constructor(private readonly repo: LevelRepository) {}

  async execute(input: UpdateLevelDefinitionInput): Promise<UpdateLevelDefinitionOutput> {
    const levelId = LevelId.create(input.levelId);
    const level = await this.repo.findById(levelId);
    if (!level) throw new NotFoundError(`Level not found: ${input.levelId}`);

    const boardSize = BoardSize.create(input.boardSize.rows, input.boardSize.cols);
    const cells = input.cells.map((c) =>
      CellSpec.create(
        Position.create(c.position.row, c.position.col),
        c.type as CellType,
        c.direction as Direction | undefined
      )
    );

    level.updateDefinition(LevelDefinition.create(boardSize, cells));
    await this.repo.save(level);

    return { levelId: level.id.value };
  }
}
