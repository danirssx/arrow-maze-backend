import { LevelId } from "../../../domain/level-catalog/value-objects/LevelId.js";
import { NotFoundError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";

export type ArchiveLevelInput = { levelId: string };
export type ArchiveLevelOutput = { levelId: string };

export class ArchiveLevelUseCase implements UseCase<ArchiveLevelInput, ArchiveLevelOutput> {
  constructor(private readonly repo: LevelRepository) {}

  async execute(input: ArchiveLevelInput): Promise<ArchiveLevelOutput> {
    const levelId = LevelId.create(input.levelId);
    const level = await this.repo.findById(levelId);
    if (!level) throw new NotFoundError(`Level not found: ${input.levelId}`);

    level.archive();
    await this.repo.save(level);

    return { levelId: level.id.getValue() };
  }
}
