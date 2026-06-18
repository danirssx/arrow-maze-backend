import { LevelId } from "../../../domain/level-catalog/value-objects/LevelId.js";
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
  createdAt: Date;
  updatedAt: Date;
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
        levelId: level.id.getValue(),
        name: level.name.getValue(),
        description: level.description.getValue(),
        difficulty: level.difficulty,
        status: level.status,
        version: level.version.getValue(),
        createdAt: level.createdAt,
        updatedAt: level.updatedAt,
      },
    };
  }
}
