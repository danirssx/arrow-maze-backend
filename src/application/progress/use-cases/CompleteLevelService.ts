import type { UseCase } from '../../aspects/UseCase.js';
import type { ProgressRepository } from '../ports/ProgressRepository.js';
import type { DomainEventBus } from '../../ports/DomainEventBus.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { Clock } from '../../ports/Clock.js';
import { PlayerProgress } from '../../../domain/progress/PlayerProgress.js';
import { LevelCompletionResult } from '../../../domain/progress/LevelCompletionResult.js';
import { CompletedAt } from '../../../domain/progress/value-objects/CompletedAt.js';
import { CompletedLevelId } from '../../../domain/progress/value-objects/CompletedLevelId.js';
import { LevelId } from '../../../domain/shared/LevelId.js';
import { LevelScore } from '../../../domain/progress/value-objects/LevelScore.js';
import { ProgressId } from '../../../domain/progress/value-objects/ProgressId.js';
import { UserId } from '../../../domain/shared/UserId.js';

export interface CompleteLevelInput {
  userId: string;
  levelId: string;
  score: number;
  timeSeconds: number;
  movesCount: number;
  completedAt: string;
}

export type CompleteLevelOutput = void;

export class CompleteLevelService implements UseCase<CompleteLevelInput, CompleteLevelOutput> {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly eventBus: DomainEventBus,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CompleteLevelInput): Promise<CompleteLevelOutput> {
    const userId = UserId.create(input.userId);
    const now = this.clock.now();
    let progress = await this.repo.findByUserId(userId);

    if (progress === null) {
      progress = PlayerProgress.empty(ProgressId.create(this.idGenerator.generate()), userId, now);
    }

    const result = new LevelCompletionResult(
      LevelId.create(input.levelId),
      new LevelScore(input.score, input.timeSeconds, input.movesCount),
      new CompletedAt(new Date(input.completedAt)),
    );

    progress.recordCompletion(result, CompletedLevelId.create(this.idGenerator.generate()), now);

    await this.repo.save(progress);
    await this.eventBus.publishAll(progress.domainEvents);
    progress.clearEvents();
  }
}
