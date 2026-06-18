import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { GetLevelsInput, GetLevelsOutput } from '../../../src/application/level-catalog/use-cases/GetLevelsUseCase.js';
import type { GetLevelInput, GetLevelOutput } from '../../../src/application/level-catalog/use-cases/GetLevelUseCase.js';
import type { CreateLevelInput, CreateLevelOutput } from '../../../src/application/level-catalog/use-cases/CreateLevelUseCase.js';
import type { UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput } from '../../../src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.js';
import type { PublishLevelInput, PublishLevelOutput } from '../../../src/application/level-catalog/use-cases/PublishLevelUseCase.js';
import type { ArchiveLevelInput, ArchiveLevelOutput } from '../../../src/application/level-catalog/use-cases/ArchiveLevelUseCase.js';
import type { TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { ValidationError, UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { createLevelCatalogTestApp } from '../../helpers/createLevelCatalogTestApp.js';

const VALID_BODY: CreateLevelInput = {
  name: 'Test Level',
  description: 'A test level',
  difficulty: 'EASY',
  boardSize: { rows: 3, cols: 3 },
  cells: [
    { position: { row: 0, col: 0 }, type: 'START' },
    { position: { row: 0, col: 1 }, type: 'ARROW', direction: 'RIGHT' },
    { position: { row: 0, col: 2 }, type: 'END' },
  ],
};

class FakeGetLevelsUseCase implements UseCase<GetLevelsInput, GetLevelsOutput> {
  async execute(_input: GetLevelsInput): Promise<GetLevelsOutput> { return { levels: [] }; }
}

class FakeGetLevelUseCase implements UseCase<GetLevelInput, GetLevelOutput> {
  async execute(_input: GetLevelInput): Promise<GetLevelOutput> {
    return { level: { levelId: 'l-1', name: 'n', description: 'd', difficulty: 'EASY', status: 'PUBLISHED', version: 1, createdAt: new Date(), updatedAt: new Date() } };
  }
}

class FakeCreateLevelUseCase implements UseCase<CreateLevelInput, CreateLevelOutput> {
  error: Error | null = null;
  async execute(_input: CreateLevelInput): Promise<CreateLevelOutput> {
    if (this.error) throw this.error;
    return { levelId: '550e8400-e29b-41d4-a716-446655440099' };
  }
}

class FakeUpdateDefinitionUseCase implements UseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput> {
  async execute(_input: UpdateLevelDefinitionInput): Promise<UpdateLevelDefinitionOutput> { return { levelId: 'l-1' }; }
}

class FakePublishUseCase implements UseCase<PublishLevelInput, PublishLevelOutput> {
  async execute(_input: PublishLevelInput): Promise<PublishLevelOutput> { return { levelId: 'l-1' }; }
}

class FakeArchiveUseCase implements UseCase<ArchiveLevelInput, ArchiveLevelOutput> {
  async execute(_input: ArchiveLevelInput): Promise<ArchiveLevelOutput> { return { levelId: 'l-1' }; }
}

class FakeTokenService implements TokenService {
  verify(token: string): { userId: string; role: string } {
    if (token === 'invalid-token') throw new UnauthorizedError('Invalid token');
    if (token === 'admin-token') return { userId: 'u-admin', role: 'ADMIN' };
    return { userId: 'u-1', role: 'USER' };
  }
  generate(_payload: { userId: string; role: string }): string { return 'token'; }
}

function buildApp(createLevelUseCase: FakeCreateLevelUseCase = new FakeCreateLevelUseCase()) {
  return createLevelCatalogTestApp(
    new FakeGetLevelsUseCase(),
    new FakeGetLevelUseCase(),
    createLevelUseCase,
    new FakeUpdateDefinitionUseCase(),
    new FakePublishUseCase(),
    new FakeArchiveUseCase(),
    new FakeTokenService(),
  );
}

describe('POST /levels', () => {
  it('should_return_201_with_levelId_when_admin_creates_a_valid_level', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app)
      .post('/levels')
      .set('Authorization', 'Bearer admin-token')
      .send(VALID_BODY);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.levelId).toBe('550e8400-e29b-41d4-a716-446655440099');
  });

  it('should_return_401_when_no_authorization_header_is_provided', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).post('/levels').send(VALID_BODY);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should_return_401_when_authorization_token_is_invalid', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app)
      .post('/levels')
      .set('Authorization', 'Bearer invalid-token')
      .send(VALID_BODY);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should_return_403_when_authenticated_user_is_not_admin', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app)
      .post('/levels')
      .set('Authorization', 'Bearer user-token')
      .send(VALID_BODY);

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should_return_400_when_required_fields_are_missing', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app)
      .post('/levels')
      .set('Authorization', 'Bearer admin-token')
      .send({ name: 'Level without cells' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should_return_422_when_level_definition_is_not_solvable', async () => {
    // Arrange
    const createLevelUseCase = new FakeCreateLevelUseCase();
    createLevelUseCase.error = new ValidationError('Level is not solvable');
    const app = buildApp(createLevelUseCase);

    // Act
    const res = await request(app)
      .post('/levels')
      .set('Authorization', 'Bearer admin-token')
      .send(VALID_BODY);

    // Assert
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
