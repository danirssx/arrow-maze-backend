import type { UseCase } from '../../aspects/UseCase.js';
import type { LeaderboardRepository } from '../ports/LeaderboardRepository.js';
import type { LevelRepository } from '../../level-catalog/ports/LevelRepository.js';
import { LevelId } from '../../../domain/shared/LevelId.js';
import { NotFoundError } from '../../../shared/errors/ApplicationError.js';

export interface GetLeaderboardInput {
  levelId: string;
}

export interface ScoreEntryDto {
  entryId: string;
  userId: string;
  usernameSnapshot: string;
  score: number;
  timeSeconds: number;
  movesCount: number;
  rank: number;
  submittedAt: Date;
}

export interface GetLeaderboardOutput {
  levelId: string;
  entries: ScoreEntryDto[];
  leaderboardId?: string;
  updatedAt?: Date;
}

export class GetLeaderboardService implements UseCase<GetLeaderboardInput, GetLeaderboardOutput> {
  constructor(
    private readonly repo: LeaderboardRepository,
    private readonly levelRepository: LevelRepository,
  ) {}

  async execute(input: GetLeaderboardInput): Promise<GetLeaderboardOutput> {
    const levelId = LevelId.create(input.levelId);
    const leaderboard = await this.repo.findByLevelId(levelId);

    if (leaderboard === null) {
      const level = await this.levelRepository.findById(levelId);
      if (level === null) {
        throw new NotFoundError(`Level not found: ${input.levelId}`);
      }

      return {
        levelId: level.id.value,
        entries: [],
      };
    }

    return {
      leaderboardId: leaderboard.id.value,
      levelId: leaderboard.levelId.value,
      updatedAt: leaderboard.updatedAt.value,
      entries: leaderboard.entries.map((e) => ({
        entryId: e.id.value,
        userId: e.userId.value,
        usernameSnapshot: e.usernameSnapshot.value,
        score: e.score.value,
        timeSeconds: e.timeSeconds.value,
        movesCount: e.movesCount.value,
        rank: e.rank?.value ?? 0,
        submittedAt: e.submittedAt.value,
      })),
    };
  }
}
