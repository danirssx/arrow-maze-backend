import type { UseCase } from '../../aspects/UseCase.js';
import type { ILeaderboardRepository } from '../ports/ILeaderboardRepository.js';
import type { IDomainEventBus } from '../ports/IDomainEventBus.js';
import type { RankingService } from '../services/RankingService.js';
import type { ScoreValidationService } from '../services/ScoreValidationService.js';
import { Leaderboard } from '../../../domain/leaderboard/Leaderboard.js';
import { ScoreEntry } from '../../../domain/leaderboard/ScoreEntry.js';
import { EntryId } from '../../../domain/leaderboard/value-objects/EntryId.js';
import { LeaderboardId } from '../../../domain/leaderboard/value-objects/LeaderboardId.js';
import { LevelId } from '../../../domain/leaderboard/value-objects/LevelId.js';
import { MaxLeaderboardEntries } from '../../../domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { MoveCount } from '../../../domain/leaderboard/value-objects/MoveCount.js';
import { Score } from '../../../domain/leaderboard/value-objects/Score.js';
import { SubmittedAt } from '../../../domain/leaderboard/value-objects/SubmittedAt.js';
import { TimeSeconds } from '../../../domain/leaderboard/value-objects/TimeSeconds.js';
import { UserId } from '../../../domain/leaderboard/value-objects/UserId.js';
import { UsernameSnapshot } from '../../../domain/leaderboard/value-objects/UsernameSnapshot.js';
import { NotFoundError } from '../../../shared/errors/ApplicationError.js';

export interface SubmitScoreInput {
  leaderboardId: string;
  entryId: string;
  userId: string;
  levelId: string;
  usernameSnapshot: string;
  score: number;
  timeSeconds: number;
  movesCount: number;
}

export type SubmitScoreOutput = void;

export class SubmitScoreService implements UseCase<SubmitScoreInput, SubmitScoreOutput> {
  constructor(
    private readonly leaderboardRepository: ILeaderboardRepository,
    private readonly rankingService: RankingService,
    private readonly validationService: ScoreValidationService,
    private readonly eventBus: IDomainEventBus,
  ) {}

  async execute(input: SubmitScoreInput): Promise<SubmitScoreOutput> {
    this.validationService.validate({
      score: input.score,
      timeSeconds: input.timeSeconds,
      movesCount: input.movesCount,
    });

    const levelId = new LevelId(input.levelId);

    let leaderboard = await this.leaderboardRepository.findByLevelId(levelId);

    if (leaderboard === null) {
      leaderboard = Leaderboard.empty(
        new LeaderboardId(input.leaderboardId),
        levelId,
        MaxLeaderboardEntries.DEFAULT,
      );
    }

    const entry = ScoreEntry.create({
      id: new EntryId(input.entryId),
      userId: new UserId(input.userId),
      levelId,
      usernameSnapshot: new UsernameSnapshot(input.usernameSnapshot),
      score: new Score(input.score),
      timeSeconds: new TimeSeconds(input.timeSeconds),
      movesCount: new MoveCount(input.movesCount),
      submittedAt: SubmittedAt.now(),
    });

    leaderboard.submitEntry(entry);

    await this.leaderboardRepository.save(leaderboard);
    await this.eventBus.publishAll(leaderboard.domainEvents);
    leaderboard.clearEvents();
  }
}
