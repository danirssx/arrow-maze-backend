import { LevelId } from "../../../domain/shared/LevelId.js";
import { NotFoundError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";
import type { Clock } from "../../ports/Clock.js";
import { assertAdminActor } from "./authorizeLevelCatalogMutation.js";

export type ArchiveLevelInput = { actorRole: string; levelId: string };
export type ArchiveLevelOutput = { levelId: string };

export class ArchiveLevelUseCase implements UseCase<ArchiveLevelInput, ArchiveLevelOutput> {
  constructor(
    private readonly repo: LevelRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ArchiveLevelInput): Promise<ArchiveLevelOutput> {
    assertAdminActor(input.actorRole);

    const levelId = LevelId.create(input.levelId);
    const level = await this.repo.findById(levelId);
    if (!level) throw new NotFoundError(`Level not found: ${input.levelId}`);

    level.archive(this.clock.now());
    await this.repo.save(level);

    return { levelId: level.id.value };
  }
}
