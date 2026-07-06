import { LevelId } from "../../../domain/shared/LevelId.js";
import { NotFoundError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";

export type GetLevelInput = { levelId: string };

export type LevelDto = {
  levelId: string;
  name: string;
  description: string;
  difficulty: string;
  status: string;
  version: number;
  definition: LevelDefinitionDto;
  timeLimitSeconds?: number;
  createdAt: string;
  updatedAt: string;
};

export type BoardShapeDto = {
  type: string;
  cells: { row: number; col: number }[];
};

export type LevelDefinitionDto = {
  attempts: number;
  arrows: {
    id: string;
    color: string;
    path: { row: number; col: number }[];
    direction: string;
  }[];
  boardShape?: BoardShapeDto;
};

export type GetLevelOutput = { level: LevelDto };

export class GetLevelUseCase implements UseCase<GetLevelInput, GetLevelOutput> {
  constructor(private readonly repo: LevelRepository) {}

  async execute(input: GetLevelInput): Promise<GetLevelOutput> {
    const levelId = LevelId.create(input.levelId);
    const level = await this.repo.findById(levelId);
    if (!level) throw new NotFoundError(`Level not found: ${input.levelId}`);

    return {
      level: {
        levelId: level.id.value,
        name: level.name.value,
        description: level.description.value,
        difficulty: level.difficulty,
        status: level.status,
        version: level.version.value,
        definition: {
          attempts: level.definition.attempts,
          arrows: level.definition.arrows.map((arrow) => ({
            id: arrow.id,
            color: arrow.color,
            path: arrow.path.map((position) => ({ row: position.row, col: position.col })),
            direction: arrow.direction,
          })),
          ...(level.boardShape !== undefined
            ? {
                boardShape: {
                  type: level.boardShape.type,
                  cells: level.boardShape.cells.map((cell) => ({
                    row: cell.row,
                    col: cell.col,
                  })),
                },
              }
            : {}),
        },
        ...(level.timeLimit !== undefined ? { timeLimitSeconds: level.timeLimit.value } : {}),
        createdAt: level.createdAt.toISOString(),
        updatedAt: level.updatedAt.toISOString(),
      },
    };
  }
}
