import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { GetLevelsInput, GetLevelsOutput } from '../../../src/application/level-catalog/use-cases/GetLevelsUseCase.js';
import type { GetLevelInput, GetLevelOutput } from '../../../src/application/level-catalog/use-cases/GetLevelUseCase.js';
import type { CreateLevelInput, CreateLevelOutput } from '../../../src/application/level-catalog/use-cases/CreateLevelUseCase.js';
import type { UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput } from '../../../src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.js';
import type { PublishLevelInput, PublishLevelOutput } from '../../../src/application/level-catalog/use-cases/PublishLevelUseCase.js';
import type { ArchiveLevelInput, ArchiveLevelOutput } from '../../../src/application/level-catalog/use-cases/ArchiveLevelUseCase.js';
import type { TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { ForbiddenError, ValidationError, UnauthorizedError } from '../../../src/shared/errors/ApplicationError.js';
import { createLevelCatalogTestApp } from '../../helpers/createLevelCatalogTestApp.js';

const VALID_BODY: Omit<CreateLevelInput, 'actorRole'> = {
  name: 'Test Level',
  description: 'A test level',
  difficulty: 'EASY',
  attempts: 5,
  arrows: [
    { id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'UP' },
  ],
};

class FakeGetLevelsUseCase implements UseCase<GetLevelsInput, GetLevelsOutput> {
  async execute(_input: GetLevelsInput): Promise<GetLevelsOutput> { return { levels: [] }; }
}

class FakeGetLevelUseCase implements UseCase<GetLevelInput, GetLevelOutput> {
  async execute(_input: GetLevelInput): Promise<GetLevelOutput> {
    return {
      level: {
        levelId: 'l-1',
        name: 'n',
        description: 'd',
        difficulty: 'EASY',
        status: 'PUBLISHED',
        version: 1,
        definition: { attempts: 5, arrows: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }
}

class FakeCreateLevelUseCase implements UseCase<CreateLevelInput, CreateLevelOutput> {
  error: Error | null = null;
  lastInput: CreateLevelInput | null = null;
  async execute(input: CreateLevelInput): Promise<CreateLevelOutput> {
    this.lastInput = input;
    if (input.actorRole !== 'ADMIN') throw new ForbiddenError('Admin access required');
    if (this.error) throw this.error;
    return { levelId: '550e8400-e29b-41d4-a716-446655440099' };
  }
}

class FakeUpdateDefinitionUseCase implements UseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput> {
  lastInput: UpdateLevelDefinitionInput | null = null;
  async execute(input: UpdateLevelDefinitionInput): Promise<UpdateLevelDefinitionOutput> {
    this.lastInput = input;
    if (input.actorRole !== 'ADMIN') throw new ForbiddenError('Admin access required');
    return { levelId: 'l-1' };
  }
}

class FakePublishUseCase implements UseCase<PublishLevelInput, PublishLevelOutput> {
  lastInput: PublishLevelInput | null = null;
  async execute(input: PublishLevelInput): Promise<PublishLevelOutput> {
    this.lastInput = input;
    if (input.actorRole !== 'ADMIN') throw new ForbiddenError('Admin access required');
    return { levelId: 'l-1' };
  }
}

class FakeArchiveUseCase implements UseCase<ArchiveLevelInput, ArchiveLevelOutput> {
  lastInput: ArchiveLevelInput | null = null;
  async execute(input: ArchiveLevelInput): Promise<ArchiveLevelOutput> {
    this.lastInput = input;
    if (input.actorRole !== 'ADMIN') throw new ForbiddenError('Admin access required');
    return { levelId: 'l-1' };
  }
}

class FakeTokenService implements TokenService {
  verify(token: string): { userId: string; role: string } {
    if (token === 'invalid-token') throw new UnauthorizedError('Invalid token');
    if (token === 'admin-token') return { userId: 'u-admin', role: 'ADMIN' };
    return { userId: 'u-1', role: 'USER' };
  }
  generate(_payload: { userId: string; role: string }): string { return 'token'; }
}

function buildApp(overrides: {
  createLevelUseCase?: FakeCreateLevelUseCase;
  updateDefinitionUseCase?: FakeUpdateDefinitionUseCase;
  publishLevelUseCase?: FakePublishUseCase;
  archiveLevelUseCase?: FakeArchiveUseCase;
} = {}) {
  return createLevelCatalogTestApp(
    new FakeGetLevelsUseCase(),
    new FakeGetLevelUseCase(),
    overrides.createLevelUseCase ?? new FakeCreateLevelUseCase(),
    overrides.updateDefinitionUseCase ?? new FakeUpdateDefinitionUseCase(),
    overrides.publishLevelUseCase ?? new FakePublishUseCase(),
    overrides.archiveLevelUseCase ?? new FakeArchiveUseCase(),
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
      .send({ name: 'Level without arrows' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should_forward_board_shape_to_the_use_case_when_present', async () => {
    // Arrange
    const createLevelUseCase = new FakeCreateLevelUseCase();
    const app = buildApp({ createLevelUseCase });
    const body = {
      ...VALID_BODY,
      boardShape: { type: 'CELL_MASK', cells: [{ row: 0, col: 0 }] },
    };

    // Act
    const res = await request(app)
      .post('/levels')
      .set('Authorization', 'Bearer admin-token')
      .send(body);

    // Assert
    expect(res.status).toBe(201);
    expect(createLevelUseCase.lastInput?.actorRole).toBe('ADMIN');
    expect(createLevelUseCase.lastInput?.boardShape).toEqual({
      type: 'CELL_MASK',
      cells: [{ row: 0, col: 0 }],
    });
  });

  it('should_forward_board_size_to_the_use_case_when_present', async () => {
    // Arrange
    const createLevelUseCase = new FakeCreateLevelUseCase();
    const app = buildApp({ createLevelUseCase });
    const body = {
      ...VALID_BODY,
      boardSize: { rows: 8, cols: 10 },
    };

    // Act
    const res = await request(app)
      .post('/levels')
      .set('Authorization', 'Bearer admin-token')
      .send(body);

    // Assert
    expect(res.status).toBe(201);
    expect(createLevelUseCase.lastInput?.boardSize).toEqual({ rows: 8, cols: 10 });
  });

  it('should_return_422_when_level_definition_is_not_solvable', async () => {
    // Arrange
    const createLevelUseCase = new FakeCreateLevelUseCase();
    createLevelUseCase.error = new ValidationError('Level is not solvable');
    const app = buildApp({ createLevelUseCase });

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

describe('Level catalog mutation authorization', () => {
  const VALID_DEFINITION_BODY = {
    arrows: [
      { id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'UP' },
    ],
    attempts: 5,
  };

  it('should_return_200_when_admin_updates_level_definition', async () => {
    // Arrange
    const updateDefinitionUseCase = new FakeUpdateDefinitionUseCase();
    const app = buildApp({ updateDefinitionUseCase });

    // Act
    const res = await request(app)
      .put('/levels/l-1/definition')
      .set('Authorization', 'Bearer admin-token')
      .send(VALID_DEFINITION_BODY);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.levelId).toBe('l-1');
    expect(updateDefinitionUseCase.lastInput?.actorRole).toBe('ADMIN');
  });

  it('should_return_403_when_user_updates_level_definition', async () => {
    // Arrange
    const updateDefinitionUseCase = new FakeUpdateDefinitionUseCase();
    const app = buildApp({ updateDefinitionUseCase });

    // Act
    const res = await request(app)
      .put('/levels/l-1/definition')
      .set('Authorization', 'Bearer user-token')
      .send(VALID_DEFINITION_BODY);

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(updateDefinitionUseCase.lastInput?.actorRole).toBe('USER');
  });

  it('should_return_401_when_anonymous_user_updates_level_definition', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).put('/levels/l-1/definition').send(VALID_DEFINITION_BODY);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should_return_200_when_admin_publishes_level', async () => {
    // Arrange
    const publishLevelUseCase = new FakePublishUseCase();
    const app = buildApp({ publishLevelUseCase });

    // Act
    const res = await request(app)
      .post('/levels/l-1/publish')
      .set('Authorization', 'Bearer admin-token');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.levelId).toBe('l-1');
    expect(publishLevelUseCase.lastInput).toEqual({ actorRole: 'ADMIN', levelId: 'l-1' });
  });

  it('should_return_403_when_user_publishes_level', async () => {
    // Arrange
    const publishLevelUseCase = new FakePublishUseCase();
    const app = buildApp({ publishLevelUseCase });

    // Act
    const res = await request(app)
      .post('/levels/l-1/publish')
      .set('Authorization', 'Bearer user-token');

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(publishLevelUseCase.lastInput).toEqual({ actorRole: 'USER', levelId: 'l-1' });
  });

  it('should_return_401_when_anonymous_user_publishes_level', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).post('/levels/l-1/publish');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should_return_200_when_admin_archives_level', async () => {
    // Arrange
    const archiveLevelUseCase = new FakeArchiveUseCase();
    const app = buildApp({ archiveLevelUseCase });

    // Act
    const res = await request(app)
      .post('/levels/l-1/archive')
      .set('Authorization', 'Bearer admin-token');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.levelId).toBe('l-1');
    expect(archiveLevelUseCase.lastInput).toEqual({ actorRole: 'ADMIN', levelId: 'l-1' });
  });

  it('should_return_403_when_user_archives_level', async () => {
    // Arrange
    const archiveLevelUseCase = new FakeArchiveUseCase();
    const app = buildApp({ archiveLevelUseCase });

    // Act
    const res = await request(app)
      .post('/levels/l-1/archive')
      .set('Authorization', 'Bearer user-token');

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(archiveLevelUseCase.lastInput).toEqual({ actorRole: 'USER', levelId: 'l-1' });
  });

  it('should_return_401_when_anonymous_user_archives_level', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).post('/levels/l-1/archive');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
