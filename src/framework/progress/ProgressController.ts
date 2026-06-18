// Pattern: Controller
import type { NextFunction, Request, Response } from 'express';
import type { UseCase } from '../../application/aspects/UseCase.js';
import type { CompleteLevelInput } from '../../application/progress/use-cases/CompleteLevelService.js';
import type { LoadProgressInput, LoadProgressOutput } from '../../application/progress/use-cases/LoadProgressService.js';
import type { SyncProgressInput, SyncProgressOutput } from '../../application/progress/use-cases/SyncProgressService.js';
import { BadRequestError } from '../../shared/errors/ApplicationError.js';
import { ApiResponsePresenter } from '../errors/ApiResponsePresenter.js';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class ProgressController {
  constructor(
    private readonly loadUseCase: UseCase<LoadProgressInput, LoadProgressOutput>,
    private readonly completeLevelUseCase: UseCase<CompleteLevelInput, void>,
    private readonly syncUseCase: UseCase<SyncProgressInput, SyncProgressOutput>,
  ) {}

  async loadProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const result = await this.loadUseCase.execute({
        userId,
        newProgressId: `progress-${userId}`,
      });
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  async completeLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const levelId = Array.isArray(req.params['levelId'])
        ? req.params['levelId'][0]
        : req.params['levelId'];

      if (!levelId) throw new BadRequestError('levelId param is required');

      const { score, timeSeconds, movesCount, completedAt } = req.body as Record<string, unknown>;
      if (score === undefined || timeSeconds === undefined || movesCount === undefined || !completedAt) {
        throw new BadRequestError('score, timeSeconds, movesCount and completedAt are required');
      }

      await this.completeLevelUseCase.execute({
        userId,
        progressId: `progress-${userId}`,
        levelId,
        score: Number(score),
        timeSeconds: Number(timeSeconds),
        movesCount: Number(movesCount),
        completedAt: String(completedAt),
      });

      res.status(201).json(ApiResponsePresenter.success(null));
    } catch (err) {
      next(err);
    }
  }

  async syncProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { completedLevels } = req.body as Record<string, unknown>;

      if (!Array.isArray(completedLevels)) {
        throw new BadRequestError('completedLevels must be an array');
      }

      const result = await this.syncUseCase.execute({
        userId,
        progressId: `progress-${userId}`,
        completedLevels,
      });

      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }
}
