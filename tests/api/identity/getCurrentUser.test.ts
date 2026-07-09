import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type {
  GetCurrentUserInput,
  GetCurrentUserOutput,
} from '../../../src/application/identity/use-cases/GetCurrentUserUseCase.js';
import type { TokenPayload, TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { NotFoundError, UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { createUserTestApp } from '../../helpers/createUserTestApp.js';

const FIXED_ID = '550e8400-e29b-41d4-a716-446655440000';

const PROFILE: GetCurrentUserOutput = {
  userId: FIXED_ID,
  email: 'alice@example.com',
  username: 'alice',
  role: 'USER',
};

class FakeGetCurrentUserUseCase implements UseCase<GetCurrentUserInput, GetCurrentUserOutput> {
  result: GetCurrentUserOutput = PROFILE;
  error: Error | null = null;
  lastInput: GetCurrentUserInput | null = null;
  async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
    this.lastInput = input;
    if (this.error) throw this.error;
    return this.result;
  }
}

class FakeTokenService implements TokenService {
  generate(_payload: TokenPayload): string { return 'fake-token'; }
  verify(token: string): TokenPayload {
    if (token === 'valid-token') return { userId: FIXED_ID, role: 'USER' as never };
    throw new UnauthorizedError('Invalid token');
  }
}

describe('GET /users/me', () => {
  it('should_return_401_when_no_token_provided', async () => {
    // Arrange
    const app = createUserTestApp(new FakeGetCurrentUserUseCase(), new FakeTokenService());

    // Act
    const res = await request(app).get('/users/me');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should_return_401_when_token_is_invalid', async () => {
    // Arrange
    const app = createUserTestApp(new FakeGetCurrentUserUseCase(), new FakeTokenService());

    // Act
    const res = await request(app).get('/users/me').set('Authorization', 'Bearer bad-token');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should_return_200_with_profile_and_forward_token_user_id_when_token_is_valid', async () => {
    // Arrange
    const useCase = new FakeGetCurrentUserUseCase();
    const app = createUserTestApp(useCase, new FakeTokenService());

    // Act
    const res = await request(app).get('/users/me').set('Authorization', 'Bearer valid-token');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toEqual(PROFILE);
    // userId must come from the verified token, not the request body/query
    expect(useCase.lastInput).toEqual({ userId: FIXED_ID });
  });

  it('should_not_expose_password_hash_in_response', async () => {
    // Arrange
    const app = createUserTestApp(new FakeGetCurrentUserUseCase(), new FakeTokenService());

    // Act
    const res = await request(app).get('/users/me').set('Authorization', 'Bearer valid-token');

    // Assert
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('should_return_404_when_user_not_found', async () => {
    // Arrange
    const useCase = new FakeGetCurrentUserUseCase();
    useCase.error = new NotFoundError('User not found');
    const app = createUserTestApp(useCase, new FakeTokenService());

    // Act
    const res = await request(app).get('/users/me').set('Authorization', 'Bearer valid-token');

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
