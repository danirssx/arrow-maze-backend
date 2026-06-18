import type { UseCase } from '../../aspects/UseCase.js';
import type { IProgressRepository } from '../ports/IProgressRepository.js';
import { PlayerProgress } from '../../../domain/progress/PlayerProgress.js';
import { ProgressId } from '../../../domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../domain/progress/value-objects/UserId.js';

export interface LoadProgressInput {
  userId: string;
  newProgressId: string;
}

export interface CompletedLevelDto {
  levelId: string;
  score: number;
  timeSeconds: number;
  movesCount: number;
  completedAt: Date;
}

export interface LoadProgressOutput {
  progressId: string;
  userId: string;
  completedLevels: CompletedLevelDto[];
  version: number;
  updatedAt: Date;
}

export class LoadProgressService implements UseCase<LoadProgressInput, LoadProgressOutput> {
  constructor(private readonly repo: IProgressRepository) {}

  async execute(input: LoadProgressInput): Promise<LoadProgressOutput> {
    const userId = new UserId(input.userId);
    let progress = await this.repo.findByUserId(userId);

    if (progress === null) {
      progress = PlayerProgress.empty(new ProgressId(input.newProgressId), userId);
      await this.repo.save(progress);
    }

    return toProgressOutput(progress);
  }
}

export function toProgressOutput(progress: PlayerProgress): LoadProgressOutput {
  return {
    progressId: progress.id.value,
    userId: progress.userId.value,
    version: progress.version.value,
    updatedAt: progress.updatedAt.value,
    completedLevels: progress.completedLevels.map((cl) => ({
      levelId: cl.levelId.value,
      score: cl.bestScore.score,
      timeSeconds: cl.bestScore.timeSeconds,
      movesCount: cl.bestScore.movesCount,
      completedAt: cl.completedAt.value,
    })),
  };
}
