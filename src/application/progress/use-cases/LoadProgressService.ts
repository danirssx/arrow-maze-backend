import type { UseCase } from '../../aspects/UseCase.js';
import type { ProgressRepository } from '../ports/IProgressRepository.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { Clock } from '../../ports/Clock.js';
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
  constructor(
    private readonly repo: ProgressRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: LoadProgressInput): Promise<LoadProgressOutput> {
    const userId = UserId.create(input.userId);
    const now = this.clock.now();
    let progress = await this.repo.findByUserId(userId);

    if (progress === null) {
      progress = PlayerProgress.empty(ProgressId.create(this.idGenerator.generate()), userId, now);
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
