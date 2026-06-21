import { Level } from "../../../domain/level-catalog/Level.js";
import { Difficulty } from "../../../domain/level-catalog/enums/Difficulty.js";
import { Direction } from "../../../domain/level-catalog/enums/Direction.js";
import { ArrowSpec } from "../../../domain/level-catalog/value-objects/ArrowSpec.js";
import { BoardShape } from "../../../domain/level-catalog/value-objects/BoardShape.js";
import { LevelDefinition } from "../../../domain/level-catalog/value-objects/LevelDefinition.js";
import { LevelDescription } from "../../../domain/level-catalog/value-objects/LevelDescription.js";
import { LevelName } from "../../../domain/level-catalog/value-objects/LevelName.js";
import { LevelVersion } from "../../../domain/level-catalog/value-objects/LevelVersion.js";
import { Position } from "../../../domain/level-catalog/value-objects/Position.js";
import { TimeLimit } from "../../../domain/level-catalog/value-objects/TimeLimit.js";
import { LevelId } from "../../../domain/shared/LevelId.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";
import { parseEnumFromInput } from "../../../shared/parseEnum.js";
import { ValidationError } from "../../../shared/errors/ApplicationError.js";

export type PositionInput = { row: number; col: number };

export type ArrowInput = {
  id: string;
  color: string;
  path: PositionInput[];
  direction?: string;
};

export type BoardShapeInput = {
  type: string;
  cells: PositionInput[];
};

export type CreateLevelInput = {
  name: string;
  description: string;
  difficulty: string;
  arrows: ArrowInput[];
  attempts?: number;
  timeLimit?: number;
  boardShape?: BoardShapeInput;
};

export type CreateLevelOutput = { levelId: string };

export class CreateLevelUseCase implements UseCase<CreateLevelInput, CreateLevelOutput> {
  constructor(private readonly repo: LevelRepository) {}

  async execute(input: CreateLevelInput): Promise<CreateLevelOutput> {
    const id = LevelId.generate();
    const difficulty = parseEnumFromInput(Difficulty, input.difficulty, 'difficulty');
    const arrows = input.arrows.map((arrow) => mapArrowInput(arrow));
    const boardShape =
      input.boardShape !== undefined ? mapBoardShapeInput(input.boardShape) : undefined;
    const level = Level.draft(
      id,
      LevelName.create(input.name),
      LevelDescription.create(input.description),
      LevelDefinition.create(arrows, input.attempts),
      difficulty,
      LevelVersion.initial(),
      input.timeLimit ? TimeLimit.create(input.timeLimit) : undefined,
      boardShape
    );

    await this.repo.save(level);
    return { levelId: id.value };
  }
}

export function mapBoardShapeInput(input: BoardShapeInput): BoardShape {
  return BoardShape.create(
    input.type,
    input.cells.map((cell) => Position.create(cell.row, cell.col))
  );
}

export function mapArrowInput(input: ArrowInput): ArrowSpec {
  if (input.direction === undefined) {
    throw new ValidationError("Arrow direction is required");
  }
  const direction = parseEnumFromInput(Direction, input.direction, "direction");
  return ArrowSpec.create(
    input.id,
    input.color,
    input.path.map((position) => Position.create(position.row, position.col)),
    direction
  );
}
