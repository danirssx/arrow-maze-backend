// Pattern: Controller
import type { NextFunction, Request, Response } from 'express';
import type { UseCase } from '../../application/aspects/UseCase.js';
import type { GetLeaderboardInput, GetLeaderboardOutput } from '../../application/leaderboard/use-cases/GetLeaderboardService.js';
import type { SubmitScoreInput } from '../../application/leaderboard/use-cases/SubmitScoreService.js';
import { BadRequestError } from '../../shared/errors/ApplicationError.js';
import { ApiResponsePresenter } from '../errors/ApiResponsePresenter.js';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class LeaderboardController {
  constructor(
    private readonly submitScoreUseCase: UseCase<SubmitScoreInput, void>,
    private readonly getLeaderboardUseCase: UseCase<GetLeaderboardInput, GetLeaderboardOutput>,
  ) {}

  async submitScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { levelId, score, timeSeconds, movesCount } = req.body as Record<string, unknown>;

      if (!levelId || score === undefined || timeSeconds === undefined || movesCount === undefined) {
        throw new BadRequestError(
          'levelId, score, timeSeconds and movesCount are required',
        );
      }

      const userId = (req as AuthenticatedRequest).user.userId;

      await this.submitScoreUseCase.execute({
        userId,
        levelId: String(levelId),
        score: Number(score),
        timeSeconds: Number(timeSeconds),
        movesCount: Number(movesCount),
      });

      res.status(201).json(ApiResponsePresenter.success(null));
    } catch (err) {
      next(err);
    }
  }

  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const levelId = Array.isArray(req.params['levelId'])
        ? req.params['levelId'][0]
        : req.params['levelId'];

      if (!levelId) {
        throw new BadRequestError('levelId is required');
      }

      const result = await this.getLeaderboardUseCase.execute({ levelId });

      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }
}
