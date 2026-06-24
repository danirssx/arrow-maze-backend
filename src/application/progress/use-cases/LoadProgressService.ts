import type { UseCase } from '../../aspects/UseCase.js';
import type { ProgressRepository } from '../ports/IProgressRepository.js';
import { PlayerProgress } from '../../../domain/progress/PlayerProgress.js';
import { ProgressId } from '../../../domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../domain/shared/UserId.js';

export interface LoadProgressInput {
  userId: string;
}

export interface CompletedLevelDto {
  levelId: string;
  score: number;
  timeSeconds: number;
  movesCount: number;
  completedAt: string;
}

export interface LoadProgressOutput {
  progressId: string;
  userId: string;
  completedLevels: CompletedLevelDto[];
  version: number;
  updatedAt: string;
}

export class LoadProgressService implements UseCase<LoadProgressInput, LoadProgressOutput> {
  constructor(private readonly repo: ProgressRepository) {}

  async execute(input: LoadProgressInput): Promise<LoadProgressOutput> {
    const userId = UserId.create(input.userId);
    let progress = await this.repo.findByUserId(userId);

    if (progress === null) {
      progress = PlayerProgress.empty(ProgressId.generate(), userId);
    }

    return toProgressOutput(progress);
  }
}

export function toProgressOutput(progress: PlayerProgress): LoadProgressOutput {
  return {
    progressId: progress.id.value,
    userId: progress.userId.value,
    version: progress.version.value,
    updatedAt: progress.updatedAt.value.toISOString(),
    completedLevels: progress.completedLevels.map((cl) => ({
      levelId: cl.levelId.value,
      score: cl.bestScore.score,
      timeSeconds: cl.bestScore.timeSeconds,
      movesCount: cl.bestScore.movesCount,
      completedAt: cl.completedAt.value.toISOString(),
    })),
  };
}
