import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelStatus } from "../../../domain/level-catalog/enums/LevelStatus.js";
import type { LevelRepository } from "../ports/LevelRepository.js";

export type ListAdminLevelsInput = { status?: LevelStatus };

export type AdminLevelSummaryDto = {
  levelId: string;
  name: string;
  difficulty: string;
  status: string;
  arrowCount: number;
  attempts: number;
  timeLimitSeconds?: number;
  createdAt: Date;
};

export type ListAdminLevelsOutput = { levels: AdminLevelSummaryDto[] };

/**
 * Admin catalog query: list every level (any status) as summaries, optionally filtered
 * by status. Authorization is the coarse `requireAdmin` route gate (MAZ-195); this use
 * case is a pure read, like `GetLevelsUseCase`.
 */
export class ListAdminLevelsUseCase implements UseCase<ListAdminLevelsInput, ListAdminLevelsOutput> {
  constructor(private readonly repo: LevelRepository) {}

  async execute(input: ListAdminLevelsInput): Promise<ListAdminLevelsOutput> {
    const levels = await this.repo.findAll(input.status);
    return {
      levels: levels.map((l) => ({
        levelId: l.id.value,
        name: l.name.value,
        difficulty: l.difficulty,
        status: l.status,
        arrowCount: l.definition.arrows.length,
        attempts: l.definition.attempts,
        ...(l.timeLimit !== undefined ? { timeLimitSeconds: l.timeLimit.value } : {}),
        createdAt: l.createdAt,
      })),
    };
  }
}
