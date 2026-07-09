import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UserRole } from '../../domain/identity/enums/UserRole.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/ApplicationError.js';
import type { AuthenticatedRequest } from './authMiddleware.js';

/**
 * Coarse, transport-level authorization guard for `/admin/*` routes.
 *
 * Runs AFTER `authMiddleware` (which authenticates the Bearer token and sets
 * `req.user = { userId, role }`) and only lets ADMIN roles through: a request with no
 * authenticated user is rejected with 401 (defensive, if mounted without
 * `authMiddleware`) and a non-ADMIN with 403. Fine-grained, per-action authorization
 * stays in the application use cases (`assertAdminActor`, MAZ-177); this is the
 * route-level gate, analogous to `authMiddleware` itself.
 */
export const requireAdmin: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const user = (req as Partial<AuthenticatedRequest>).user;
  if (!user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  if (user.role !== UserRole.ADMIN) {
    next(new ForbiddenError('Admin access required'));
    return;
  }
  next();
};
