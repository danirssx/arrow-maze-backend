import { Level } from "../../../domain/level-catalog/Level.js";
import { Difficulty } from "../../../domain/level-catalog/enums/Difficulty.js";
import { Direction } from "../../../domain/level-catalog/enums/Direction.js";
import { ArrowSpec } from "../../../domain/level-catalog/value-objects/ArrowSpec.js";
import { BoardShape } from "../../../domain/level-catalog/value-objects/BoardShape.js";
import { BoardSize } from "../../../domain/level-catalog/value-objects/BoardSize.js";
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
import type { IdGenerator } from "../../ports/IdGenerator.js";
import type { Clock } from "../../ports/Clock.js";
import { assertAdminActor } from "./authorizeLevelCatalogMutation.js";

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

export type BoardSizeInput = {
  rows: number;
  cols: number;
};

export type CreateLevelInput = {
  actorRole: string;
  name: string;
  description: string;
  difficulty: string;
  arrows: ArrowInput[];
  attempts?: number;
  timeLimit?: number;
  boardShape?: BoardShapeInput;
  boardSize?: BoardSizeInput;
};

export type CreateLevelOutput = { levelId: string };

export class CreateLevelUseCase implements UseCase<CreateLevelInput, CreateLevelOutput> {
  constructor(
    private readonly repo: LevelRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateLevelInput): Promise<CreateLevelOutput> {
    assertAdminActor(input.actorRole);

    const id = LevelId.create(this.idGenerator.generate());
    const now = this.clock.now();
    const difficulty = parseEnumFromInput(Difficulty, input.difficulty, 'difficulty');
    const arrows = input.arrows.map((arrow) => mapArrowInput(arrow));
    const boardShape = mapBoardFrameInput(input.boardShape, input.boardSize);
    const level = Level.draft(
      id,
      LevelName.create(input.name),
      LevelDescription.create(input.description),
      LevelDefinition.create(arrows, input.attempts),
      difficulty,
      LevelVersion.initial(),
      now,
      input.timeLimit ? TimeLimit.create(input.timeLimit) : undefined,
      boardShape
    );

    await this.repo.save(level);
    return { levelId: id.value };
  }
}

function mapBoardFrameInput(
  boardShapeInput: BoardShapeInput | undefined,
  boardSizeInput: BoardSizeInput | undefined
): BoardShape | undefined {
  if (boardShapeInput !== undefined && boardSizeInput !== undefined) {
    throw new ValidationError("boardSize and boardShape cannot be combined");
  }
  if (boardSizeInput !== undefined) {
    return mapBoardSizeInput(boardSizeInput);
  }
  if (boardShapeInput !== undefined) {
    return mapBoardShapeInput(boardShapeInput);
  }
  return undefined;
}

export function mapBoardShapeInput(input: BoardShapeInput): BoardShape {
  return BoardShape.create(
    input.type,
    input.cells.map((cell) => Position.create(cell.row, cell.col))
  );
}

export function mapBoardSizeInput(input: BoardSizeInput): BoardShape {
  return BoardShape.cellMask(BoardSize.create(input.rows, input.cols).toCells());
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
