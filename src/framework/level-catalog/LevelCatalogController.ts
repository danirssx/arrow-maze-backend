// Pattern: Controller
import type { NextFunction, Request, Response } from 'express';
import type { UseCase } from '../../application/aspects/UseCase.js';
import type { GetLevelsInput, GetLevelsOutput } from '../../application/level-catalog/use-cases/GetLevelsUseCase.js';
import type { GetLevelInput, GetLevelOutput } from '../../application/level-catalog/use-cases/GetLevelUseCase.js';
import type { CreateLevelInput, CreateLevelOutput } from '../../application/level-catalog/use-cases/CreateLevelUseCase.js';
import type { UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput } from '../../application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.js';
import type { PublishLevelInput, PublishLevelOutput } from '../../application/level-catalog/use-cases/PublishLevelUseCase.js';
import type { ArchiveLevelInput, ArchiveLevelOutput } from '../../application/level-catalog/use-cases/ArchiveLevelUseCase.js';
import { BadRequestError, ForbiddenError } from '../../shared/errors/ApplicationError.js';
import { ApiResponsePresenter } from '../errors/ApiResponsePresenter.js';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class LevelCatalogController {
  constructor(
    private readonly getLevelsUseCase: UseCase<GetLevelsInput, GetLevelsOutput>,
    private readonly getLevelUseCase: UseCase<GetLevelInput, GetLevelOutput>,
    private readonly createLevelUseCase: UseCase<CreateLevelInput, CreateLevelOutput>,
    private readonly updateDefinitionUseCase: UseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput>,
    private readonly publishLevelUseCase: UseCase<PublishLevelInput, PublishLevelOutput>,
    private readonly archiveLevelUseCase: UseCase<ArchiveLevelInput, ArchiveLevelOutput>,
  ) {}

  async listLevels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getLevelsUseCase.execute({});
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  async getLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const levelId = String(req.params['levelId']);
      const result = await this.getLevelUseCase.execute({ levelId });
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  async createLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if ((req as AuthenticatedRequest).user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      const { name, description, difficulty, boardSize, cells, timeLimit, moveCount } =
        req.body as Record<string, unknown>;

      if (!name || !description || !difficulty || !boardSize || !cells) {
        throw new BadRequestError('name, description, difficulty, boardSize and cells are required');
      }

      const result = await this.createLevelUseCase.execute({
        name: String(name),
        description: String(description),
        difficulty: String(difficulty),
        boardSize: boardSize as CreateLevelInput['boardSize'],
        cells: cells as CreateLevelInput['cells'],
        ...(timeLimit !== undefined && { timeLimit: Number(timeLimit) }),
        ...(moveCount !== undefined && { moveCount: Number(moveCount) }),
      });

      res.status(201).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  async updateDefinition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if ((req as AuthenticatedRequest).user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      const levelId = String(req.params['levelId']);
      const { boardSize, cells } = req.body as Record<string, unknown>;

      if (!boardSize || !cells) {
        throw new BadRequestError('boardSize and cells are required');
      }

      const result = await this.updateDefinitionUseCase.execute({
        levelId,
        boardSize: boardSize as UpdateLevelDefinitionInput['boardSize'],
        cells: cells as UpdateLevelDefinitionInput['cells'],
      });

      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  async publishLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if ((req as AuthenticatedRequest).user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      const levelId = String(req.params['levelId']);
      const result = await this.publishLevelUseCase.execute({ levelId });
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  async archiveLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if ((req as AuthenticatedRequest).user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      const levelId = String(req.params['levelId']);
      const result = await this.archiveLevelUseCase.execute({ levelId });
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }
}
