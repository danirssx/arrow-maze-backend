import type { LevelSolvabilityPolicy } from "../../../domain/level-catalog/LevelSolvabilityPolicy.js";
import { LevelId } from "../../../domain/shared/LevelId.js";
import { NotFoundError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";
import type { Clock } from "../../ports/Clock.js";
import { assertAdminActor } from "./authorizeLevelCatalogMutation.js";

export type PublishLevelInput = { actorRole: string; levelId: string };
export type PublishLevelOutput = { levelId: string };

export class PublishLevelUseCase implements UseCase<PublishLevelInput, PublishLevelOutput> {
  constructor(
    private readonly repo: LevelRepository,
    private readonly policy: LevelSolvabilityPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(input: PublishLevelInput): Promise<PublishLevelOutput> {
    assertAdminActor(input.actorRole);

    const levelId = LevelId.create(input.levelId);
    const level = await this.repo.findById(levelId);
    if (!level) throw new NotFoundError(`Level not found: ${input.levelId}`);

    level.publish(this.policy, this.clock.now());
    await this.repo.save(level);

    return { levelId: level.id.value };
  }
}
