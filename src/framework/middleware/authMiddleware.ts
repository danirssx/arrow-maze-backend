import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { TokenService } from '../../application/identity/ports/TokenService.js';
import { UnauthorizedError } from '../../shared/errors/ApplicationError.js';

export interface AuthenticatedRequest extends Request {
  user: { userId: string; role: string };
}

export function createAuthMiddleware(tokenService: TokenService): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(new UnauthorizedError('Authorization header with Bearer token required'));
      return;
    }

    try {
      const token = authHeader.slice(7);
      const payload = tokenService.verify(token);
      (req as AuthenticatedRequest).user = payload;
      next();
    } catch (err) {
      next(err);
    }
  };
}
