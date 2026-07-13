import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";

export type GetLevelsInput = { supports3d?: boolean };

export type LevelSummaryDto = {
  levelId: string;
  name: string;
  difficulty: string;
  arrowCount: number;
  attempts: number;
  timeLimitSeconds?: number;
  createdAt: string;
};

export type GetLevelsOutput = { levels: LevelSummaryDto[] };

export class GetLevelsUseCase implements UseCase<GetLevelsInput, GetLevelsOutput> {
  constructor(private readonly repo: LevelRepository) {}

  async execute(input: GetLevelsInput): Promise<GetLevelsOutput> {
    const levels = await this.repo.findAllPublished();
    const visible = input.supports3d ? levels : levels.filter((l) => l.dimensions === 2);
    return {
      levels: visible.map((l) => ({
        levelId: l.id.value,
        name: l.name.value,
        difficulty: l.difficulty,
        arrowCount: l.definition.arrows.length,
        attempts: l.definition.attempts,
        ...(l.timeLimit !== undefined ? { timeLimitSeconds: l.timeLimit.value } : {}),
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }
}
