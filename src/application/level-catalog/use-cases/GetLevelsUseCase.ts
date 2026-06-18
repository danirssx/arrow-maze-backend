import type { UseCase } from "../../aspects/UseCase.js";
import type { LevelRepository } from "../ports/LevelRepository.js";

export type GetLevelsInput = Record<string, never>;

export type LevelSummaryDto = {
  levelId: string;
  name: string;
  difficulty: string;
  createdAt: Date;
};

export type GetLevelsOutput = { levels: LevelSummaryDto[] };

export class GetLevelsUseCase implements UseCase<GetLevelsInput, GetLevelsOutput> {
  constructor(private readonly repo: LevelRepository) {}

  async execute(_input: GetLevelsInput): Promise<GetLevelsOutput> {
    const levels = await this.repo.findAllPublished();
    return {
      levels: levels.map((l) => ({
        levelId: l.id.value,
        name: l.name.value,
        difficulty: l.difficulty,
        createdAt: l.createdAt,
      })),
    };
  }
}
