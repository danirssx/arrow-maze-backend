import type { UseCase } from '../../aspects/UseCase.js';
import type { IProgressRepository } from '../ports/IProgressRepository.js';
import type { IDomainEventBus } from '../ports/IDomainEventBus.js';
import { PlayerProgress } from '../../../domain/progress/PlayerProgress.js';
import { LevelCompletionResult } from '../../../domain/progress/LevelCompletionResult.js';
import { CompletedAt } from '../../../domain/progress/value-objects/CompletedAt.js';
import { LevelId } from '../../../domain/progress/value-objects/LevelId.js';
import { LevelScore } from '../../../domain/progress/value-objects/LevelScore.js';
import { ProgressId } from '../../../domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../domain/progress/value-objects/UserId.js';

export interface CompleteLevelInput {
  userId: string;
  progressId: string;
  levelId: string;
  score: number;
  timeSeconds: number;
  movesCount: number;
  completedAt: string;
}

export type CompleteLevelOutput = void;

export class CompleteLevelService implements UseCase<CompleteLevelInput, CompleteLevelOutput> {
  constructor(
    private readonly repo: IProgressRepository,
    private readonly eventBus: IDomainEventBus,
  ) {}

  async execute(input: CompleteLevelInput): Promise<CompleteLevelOutput> {
    const userId = new UserId(input.userId);
    let progress = await this.repo.findByUserId(userId);

    if (progress === null) {
      progress = PlayerProgress.empty(new ProgressId(input.progressId), userId);
    }

    const result = new LevelCompletionResult(
      new LevelId(input.levelId),
      new LevelScore(input.score, input.timeSeconds, input.movesCount),
      new CompletedAt(new Date(input.completedAt)),
    );

    progress.recordCompletion(result);

    await this.repo.save(progress);
    await this.eventBus.publishAll(progress.domainEvents);
    progress.clearEvents();
  }
}
