import { LevelDefinition } from "../../../domain/level-catalog/value-objects/LevelDefinition.js";
import { LevelId } from "../../../domain/shared/LevelId.js";
import { NotFoundError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";
import { mapArrowInput, type ArrowInput } from "./CreateLevelUseCase.js";

export type UpdateLevelDefinitionInput = {
  levelId: string;
  arrows: ArrowInput[];
  attempts?: number;
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

    level.updateDefinition(LevelDefinition.create(input.arrows.map(mapArrowInput), input.attempts));
    await this.repo.save(level);

    return { levelId: level.id.value };
  }
}
