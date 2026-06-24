import type { UseCase } from '../../aspects/UseCase.js';
import type { LeaderboardRepository } from '../ports/ILeaderboardRepository.js';
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
  submittedAt: string;
}

export interface GetLeaderboardOutput {
  leaderboardId: string;
  levelId: string;
  entries: ScoreEntryDto[];
  updatedAt: string;
}

export class GetLeaderboardService implements UseCase<GetLeaderboardInput, GetLeaderboardOutput> {
  constructor(private readonly repo: LeaderboardRepository) {}

  async execute(input: GetLeaderboardInput): Promise<GetLeaderboardOutput> {
    const levelId = LevelId.create(input.levelId);
    const leaderboard = await this.repo.findByLevelId(levelId);

    if (leaderboard === null) {
      throw new NotFoundError(`Leaderboard not found for level ${input.levelId}`);
    }

    return {
      leaderboardId: leaderboard.id.value,
      levelId: leaderboard.levelId.value,
      updatedAt: leaderboard.updatedAt.value.toISOString(),
      entries: leaderboard.entries.map((e) => ({
        entryId: e.id.value,
        userId: e.userId.value,
        usernameSnapshot: e.usernameSnapshot.value,
        score: e.score.value,
        timeSeconds: e.timeSeconds.value,
        movesCount: e.movesCount.value,
        rank: e.rank?.value ?? 0,
        submittedAt: e.submittedAt.value.toISOString(),
      })),
    };
  }
}
