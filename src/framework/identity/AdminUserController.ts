// Pattern: Controller
import type { NextFunction, Request, Response } from 'express';
import type { UseCase } from '../../application/aspects/UseCase.js';
import type { ListUsersInput, ListUsersOutput } from '../../application/identity/use-cases/ListUsersUseCase.js';
import { BadRequestError } from '../../shared/errors/ApplicationError.js';
import { ApiResponsePresenter } from '../errors/ApiResponsePresenter.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Admin-only, read-only user listing. The route is guarded by `authMiddleware` +
 * `requireAdmin` (MAZ-195); this controller only parses/validates the pagination query
 * and delegates to the read use case.
 */
export class AdminUserController {
  constructor(
    private readonly listUsersUseCase: UseCase<ListUsersInput, ListUsersOutput>,
  ) {}

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = AdminUserController.parsePositiveInt(req.query['page'], DEFAULT_PAGE, 'page');
      const limit = Math.min(
        AdminUserController.parsePositiveInt(req.query['limit'], DEFAULT_LIMIT, 'limit'),
        MAX_LIMIT,
      );
      const result = await this.listUsersUseCase.execute({ page, limit });
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  private static parsePositiveInt(raw: unknown, fallback: number, field: string): number {
    if (raw === undefined) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
      throw new BadRequestError(`${field} must be a positive integer`);
    }
    return value;
  }
}
