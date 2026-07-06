import express from 'express';
import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type {
  ListAdminLevelsInput,
  ListAdminLevelsOutput,
} from '../../../src/application/level-catalog/use-cases/ListAdminLevelsUseCase.js';
import type { TokenPayload, TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { UserRole } from '../../../src/domain/identity/enums/UserRole.js';
import { UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { ConsoleLogger } from '../../../src/infrastructure/logging/ConsoleLogger.js';
import { createErrorMiddleware } from '../../../src/framework/errors/errorMiddleware.js';
import { createAuthMiddleware } from '../../../src/framework/middleware/authMiddleware.js';
import { AdminLevelController } from '../../../src/framework/level-catalog/AdminLevelController.js';
import { createAdminLevelRouter } from '../../../src/framework/level-catalog/adminLevelRoutes.js';

class FakeTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return 'fake-token'; }
  verify(token: string): TokenPayload {
    if (token === 'admin-token') return { userId: 'u-admin', role: UserRole.ADMIN };
    if (token === 'user-token') return { userId: 'u-user', role: UserRole.USER };
    throw new UnauthorizedError('Invalid token');
  }
}

class FakeListAdminLevelsUseCase implements UseCase<ListAdminLevelsInput, ListAdminLevelsOutput> {
  lastInput: ListAdminLevelsInput | null = null;
  async execute(input: ListAdminLevelsInput): Promise<ListAdminLevelsOutput> {
    this.lastInput = input;
    return {
      levels: [
        { levelId: 'l-1', name: 'A', difficulty: 'EASY', status: 'DRAFT', arrowCount: 2, attempts: 5, createdAt: new Date('2024-01-15T10:00:00.000Z') },
        { levelId: 'l-2', name: 'B', difficulty: 'HARD', status: 'PUBLISHED', arrowCount: 4, attempts: 5, createdAt: new Date('2024-01-16T10:00:00.000Z') },
      ],
    };
  }
}

function createApp(useCase: FakeListAdminLevelsUseCase) {
  const app = express();
  app.use(express.json());
  const auth = createAuthMiddleware(new FakeTokenService());
  app.use(createAdminLevelRouter(new AdminLevelController(useCase), auth));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}

describe('GET /admin/levels', () => {
  it('should_return_200_with_levels_including_status_when_admin', async () => {
    const res = await request(createApp(new FakeListAdminLevelsUseCase()))
      .get('/admin/levels')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.levels).toHaveLength(2);
    expect(res.body.data.levels[0].status).toBe('DRAFT');
  });

  it('should_pass_the_status_filter_to_the_use_case', async () => {
    const useCase = new FakeListAdminLevelsUseCase();
    const res = await request(createApp(useCase))
      .get('/admin/levels?status=DRAFT')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(useCase.lastInput).toEqual({ status: 'DRAFT' });
  });

  it('should_return_400_when_status_is_unknown', async () => {
    const useCase = new FakeListAdminLevelsUseCase();
    const res = await request(createApp(useCase))
      .get('/admin/levels?status=NONSENSE')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(useCase.lastInput).toBeNull();
  });

  it('should_return_403_when_authenticated_user_is_not_admin', async () => {
    const res = await request(createApp(new FakeListAdminLevelsUseCase()))
      .get('/admin/levels')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should_return_401_when_no_token', async () => {
    const res = await request(createApp(new FakeListAdminLevelsUseCase())).get('/admin/levels');

    expect(res.status).toBe(401);
  });
});
