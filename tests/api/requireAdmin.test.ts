import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import type { TokenPayload, TokenService } from '../../src/application/identity/ports/TokenService.js';
import { UserRole } from '../../src/domain/identity/enums/UserRole.js';
import { UnauthorizedError } from '../../src/shared/errors/ApplicationError.js';
import { ConsoleLogger } from '../../src/infrastructure/logging/ConsoleLogger.js';
import { createErrorMiddleware } from '../../src/framework/errors/errorMiddleware.js';
import { createAuthMiddleware } from '../../src/framework/middleware/authMiddleware.js';
import { requireAdmin } from '../../src/framework/middleware/requireAdmin.js';

class FakeTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return 'fake-token'; }
  verify(token: string): TokenPayload {
    if (token === 'admin-token') return { userId: 'u-admin', role: UserRole.ADMIN };
    if (token === 'user-token') return { userId: 'u-user', role: UserRole.USER };
    throw new UnauthorizedError('Invalid token');
  }
}

function createApp() {
  const app = express();
  app.use(express.json());
  const auth = createAuthMiddleware(new FakeTokenService());
  const router = express.Router();
  router.get('/admin/ping', auth, requireAdmin, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(router);
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}

describe('requireAdmin middleware', () => {
  it('should_return_401_when_no_token', async () => {
    const res = await request(createApp()).get('/admin/ping');

    expect(res.status).toBe(401);
  });

  it('should_return_403_when_authenticated_user_is_not_admin', async () => {
    const res = await request(createApp())
      .get('/admin/ping')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should_pass_to_handler_when_authenticated_user_is_admin', async () => {
    const res = await request(createApp())
      .get('/admin/ping')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should_forward_unauthorized_when_request_has_no_authenticated_user', () => {
    // Arrange — mounted without authMiddleware: req.user is absent.
    const next = jest.fn();

    // Act
    requireAdmin({} as Request, {} as Response, next as NextFunction);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorizedError);
  });
});
