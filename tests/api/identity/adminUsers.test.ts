import express from 'express';
import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { ListUsersInput, ListUsersOutput } from '../../../src/application/identity/use-cases/ListUsersUseCase.js';
import type { TokenPayload, TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { UserRole } from '../../../src/domain/identity/enums/UserRole.js';
import { UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { ConsoleLogger } from '../../../src/infrastructure/logging/ConsoleLogger.js';
import { createErrorMiddleware } from '../../../src/framework/errors/errorMiddleware.js';
import { createAuthMiddleware } from '../../../src/framework/middleware/authMiddleware.js';
import { AdminUserController } from '../../../src/framework/identity/AdminUserController.js';
import { createAdminUserRouter } from '../../../src/framework/identity/adminUserRoutes.js';

class FakeTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return 'fake-token'; }
  verify(token: string): TokenPayload {
    if (token === 'admin-token') return { userId: 'u-admin', role: UserRole.ADMIN };
    if (token === 'user-token') return { userId: 'u-user', role: UserRole.USER };
    throw new UnauthorizedError('Invalid token');
  }
}

class FakeListUsersUseCase implements UseCase<ListUsersInput, ListUsersOutput> {
  lastInput: ListUsersInput | null = null;
  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    this.lastInput = input;
    return {
      users: [
        { userId: 'u-1', email: 'a@x.test', username: 'alice', role: 'USER', status: 'ACTIVE', createdAt: new Date('2024-01-15T10:00:00.000Z') },
      ],
      page: input.page,
      limit: input.limit,
      total: 1,
    };
  }
}

function createApp(useCase: FakeListUsersUseCase) {
  const app = express();
  app.use(express.json());
  const auth = createAuthMiddleware(new FakeTokenService());
  app.use(createAdminUserRouter(new AdminUserController(useCase), auth));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}

describe('GET /admin/users', () => {
  it('should_return_200_with_users_and_no_password_hash_when_admin', async () => {
    const res = await request(createApp(new FakeListUsersUseCase()))
      .get('/admin/users')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.users[0]).not.toHaveProperty('passwordHash');
    expect(res.body.data).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it('should_apply_page_and_limit_from_query', async () => {
    const useCase = new FakeListUsersUseCase();
    const res = await request(createApp(useCase))
      .get('/admin/users?page=2&limit=5')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(useCase.lastInput).toEqual({ page: 2, limit: 5 });
    expect(res.body.data).toMatchObject({ page: 2, limit: 5 });
  });

  it('should_default_pagination_when_absent', async () => {
    const useCase = new FakeListUsersUseCase();
    await request(createApp(useCase))
      .get('/admin/users')
      .set('Authorization', 'Bearer admin-token');

    expect(useCase.lastInput).toEqual({ page: 1, limit: 20 });
  });

  it('should_cap_limit_at_the_maximum', async () => {
    const useCase = new FakeListUsersUseCase();
    await request(createApp(useCase))
      .get('/admin/users?limit=99999')
      .set('Authorization', 'Bearer admin-token');

    expect(useCase.lastInput).toEqual({ page: 1, limit: 100 });
  });

  it('should_return_400_when_page_is_not_a_positive_integer', async () => {
    const useCase = new FakeListUsersUseCase();
    const res = await request(createApp(useCase))
      .get('/admin/users?page=0')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(useCase.lastInput).toBeNull();
  });

  it('should_return_403_when_authenticated_user_is_not_admin', async () => {
    const res = await request(createApp(new FakeListUsersUseCase()))
      .get('/admin/users')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should_return_401_when_no_token', async () => {
    const res = await request(createApp(new FakeListUsersUseCase())).get('/admin/users');

    expect(res.status).toBe(401);
  });
});
