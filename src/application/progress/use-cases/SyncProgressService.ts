import type { UseCase } from '../../aspects/UseCase.js';
import type { ProgressRepository } from '../ports/ProgressRepository.js';
import type { DomainEventBus } from '../../ports/DomainEventBus.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { Clock } from '../../ports/Clock.js';
import { PlayerProgress } from '../../../domain/progress/PlayerProgress.js';
import { LevelCompletionResult } from '../../../domain/progress/LevelCompletionResult.js';
import { ProgressMergePolicy } from '../../../domain/progress/policies/ProgressMergePolicy.js';
import { CompletedAt } from '../../../domain/progress/value-objects/CompletedAt.js';
import { CompletedLevelId } from '../../../domain/progress/value-objects/CompletedLevelId.js';
import { LevelId } from '../../../domain/shared/LevelId.js';
import { LevelScore } from '../../../domain/progress/value-objects/LevelScore.js';
import { ProgressId } from '../../../domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../domain/shared/UserId.js';
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
  completedLevels: LocalCompletedLevelDto[];
}

export type SyncProgressOutput = LoadProgressOutput;

export class SyncProgressService implements UseCase<SyncProgressInput, SyncProgressOutput> {
  private readonly mergePolicy = new ProgressMergePolicy();

  constructor(
    private readonly repo: ProgressRepository,
    private readonly eventBus: DomainEventBus,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: SyncProgressInput): Promise<SyncProgressOutput> {
    const userId = UserId.create(input.userId);
    const now = this.clock.now();
    let remote = await this.repo.findByUserId(userId);

    if (remote === null) {
      remote = PlayerProgress.empty(ProgressId.create(this.idGenerator.generate()), userId, now);
    }

    const local = PlayerProgress.empty(remote.id, userId, now);
    for (const dto of input.completedLevels) {
      local.recordCompletion(
        new LevelCompletionResult(
          LevelId.create(dto.levelId),
          new LevelScore(dto.score, dto.timeSeconds, dto.movesCount),
          new CompletedAt(new Date(dto.completedAt)),
        ),
        CompletedLevelId.create(this.idGenerator.generate()),
        now,
      );
      local.clearEvents();
    }

    const merged = this.mergePolicy.merge(local, remote, now);

    await this.repo.save(merged);
    await this.eventBus.publishAll(merged.domainEvents);
    merged.clearEvents();

    return toProgressOutput(merged);
  }
}
