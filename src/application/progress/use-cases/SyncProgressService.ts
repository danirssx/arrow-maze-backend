import type { UseCase } from '../../aspects/UseCase.js';
import type { IProgressRepository } from '../ports/IProgressRepository.js';
import type { IDomainEventBus } from '../ports/IDomainEventBus.js';
import { PlayerProgress } from '../../../domain/progress/PlayerProgress.js';
import { LevelCompletionResult } from '../../../domain/progress/LevelCompletionResult.js';
import { ProgressMergePolicy } from '../../../domain/progress/policies/ProgressMergePolicy.js';
import { CompletedAt } from '../../../domain/progress/value-objects/CompletedAt.js';
import { LevelId } from '../../../domain/progress/value-objects/LevelId.js';
import { LevelScore } from '../../../domain/progress/value-objects/LevelScore.js';
import { ProgressId } from '../../../domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../domain/progress/value-objects/UserId.js';
import { type LoadProgressOutput, toProgressOutput } from './LoadProgressService.js';

export interface LocalCompletedLevelDto {
  levelId: string;
  score: number;
  timeSeconds: number;
  movesCount: number;
  completedAt: string;
}

export interface SyncProgressInput {
  userId: string;
  progressId: string;
  completedLevels: LocalCompletedLevelDto[];
}

export type SyncProgressOutput = LoadProgressOutput;

export class SyncProgressService implements UseCase<SyncProgressInput, SyncProgressOutput> {
  private readonly mergePolicy = new ProgressMergePolicy();

  constructor(
    private readonly repo: IProgressRepository,
    private readonly eventBus: IDomainEventBus,
  ) {}

  async execute(input: SyncProgressInput): Promise<SyncProgressOutput> {
    const userId = new UserId(input.userId);
    let remote = await this.repo.findByUserId(userId);

    if (remote === null) {
      remote = PlayerProgress.empty(new ProgressId(input.progressId), userId);
    }

    const local = PlayerProgress.empty(new ProgressId(input.progressId), userId);
    for (const dto of input.completedLevels) {
      local.recordCompletion(
        new LevelCompletionResult(
          new LevelId(dto.levelId),
          new LevelScore(dto.score, dto.timeSeconds, dto.movesCount),
          new CompletedAt(new Date(dto.completedAt)),
        ),
      );
      local.clearEvents();
    }

    const merged = this.mergePolicy.merge(local, remote);

    await this.repo.save(merged);
    await this.eventBus.publishAll(merged.domainEvents);
    merged.clearEvents();

    return toProgressOutput(merged);
  }
}
