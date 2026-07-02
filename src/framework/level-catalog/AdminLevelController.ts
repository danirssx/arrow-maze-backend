// Pattern: Controller
import type { NextFunction, Request, Response } from 'express';
import type { UseCase } from '../../application/aspects/UseCase.js';
import type {
  ListAdminLevelsInput,
  ListAdminLevelsOutput,
} from '../../application/level-catalog/use-cases/ListAdminLevelsUseCase.js';
import { LevelStatus } from '../../domain/level-catalog/enums/LevelStatus.js';
import { BadRequestError } from '../../shared/errors/ApplicationError.js';
import { ApiResponsePresenter } from '../errors/ApiResponsePresenter.js';

/**
 * Admin-only level listing. The route is guarded by `authMiddleware` + `requireAdmin`
 * (MAZ-195); this controller only parses transport input (the optional `status` filter)
 * and delegates to the read use case.
 */
export class AdminLevelController {
  constructor(
    private readonly listAdminLevelsUseCase: UseCase<ListAdminLevelsInput, ListAdminLevelsOutput>,
  ) {}

  async listLevels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = AdminLevelController.parseStatus(req.query['status']);
      const input: ListAdminLevelsInput = status === undefined ? {} : { status };
      const result = await this.listAdminLevelsUseCase.execute(input);
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  private static parseStatus(raw: unknown): LevelStatus | undefined {
    if (raw === undefined) return undefined;
    const value = String(raw);
    if (!(Object.values(LevelStatus) as string[]).includes(value)) {
      throw new BadRequestError(`Unknown status filter: ${value}`);
    }
    return value as LevelStatus;
  }
}
