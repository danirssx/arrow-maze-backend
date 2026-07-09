import type { UseCase } from '../../aspects/UseCase.js';
import type { LeaderboardRepository } from '../ports/LeaderboardRepository.js';
import type { DomainEventBus } from '../../ports/DomainEventBus.js';
import type { Clock } from '../../ports/Clock.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { UserRepository } from '../../identity/ports/UserRepository.js';
import type { LevelRepository } from '../../level-catalog/ports/LevelRepository.js';
import { Leaderboard } from '../../../domain/leaderboard/Leaderboard.js';
import { ScoreEntry } from '../../../domain/leaderboard/ScoreEntry.js';
import { EntryId } from '../../../domain/leaderboard/value-objects/EntryId.js';
import { LeaderboardId } from '../../../domain/leaderboard/value-objects/LeaderboardId.js';
import { LevelId } from '../../../domain/shared/LevelId.js';
import { MaxLeaderboardEntries } from '../../../domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { MoveCount } from '../../../domain/leaderboard/value-objects/MoveCount.js';
import { Score } from '../../../domain/leaderboard/value-objects/Score.js';
import { SubmittedAt } from '../../../domain/leaderboard/value-objects/SubmittedAt.js';
import { TimeSeconds } from '../../../domain/leaderboard/value-objects/TimeSeconds.js';
import { UserId } from '../../../domain/shared/UserId.js';
import { UsernameSnapshot } from '../../../domain/leaderboard/value-objects/UsernameSnapshot.js';
import { NotFoundError } from '../../../shared/errors/ApplicationError.js';

export interface SubmitScoreInput {
  userId: string;
  levelId: string;
  score: number;
  timeSeconds: number;
  movesCount: number;
}

export type SubmitScoreOutput = void;

export class SubmitScoreService implements UseCase<SubmitScoreInput, SubmitScoreOutput> {
  constructor(
    private readonly leaderboardRepository: LeaderboardRepository,
    private readonly userRepository: UserRepository,
    private readonly levelRepository: LevelRepository,
    private readonly eventBus: DomainEventBus,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: SubmitScoreInput): Promise<SubmitScoreOutput> {
    const levelId = LevelId.create(input.levelId);
    const userId = UserId.create(input.userId);
    const now = this.clock.now();

    const [user, level] = await Promise.all([
      this.userRepository.findById(userId),
      this.levelRepository.findById(levelId),
    ]);

    if (user === null) {
      throw new NotFoundError(`User not found: ${input.userId}`);
    }

    if (level === null) {
      throw new NotFoundError(`Level not found: ${input.levelId}`);
    }

    let leaderboard = await this.leaderboardRepository.findByLevelId(levelId);

    if (leaderboard === null) {
      leaderboard = Leaderboard.empty(
        LeaderboardId.create(this.idGenerator.generate()),
        levelId,
        MaxLeaderboardEntries.DEFAULT,
        now,
      );
    }

    const entry = ScoreEntry.create({
      id: EntryId.create(this.idGenerator.generate()),
      userId,
      levelId,
      usernameSnapshot: new UsernameSnapshot(user.username.value),
      score: new Score(input.score),
      timeSeconds: new TimeSeconds(input.timeSeconds),
      movesCount: new MoveCount(input.movesCount),
      submittedAt: new SubmittedAt(now),
    });

    leaderboard.submitEntry(entry, now);

    await this.leaderboardRepository.save(leaderboard);
    await this.eventBus.publishAll(leaderboard.domainEvents);
    leaderboard.clearEvents();
  }
}
