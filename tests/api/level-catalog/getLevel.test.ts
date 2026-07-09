import request from 'supertest';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { GetLevelsInput, GetLevelsOutput } from '../../../src/application/level-catalog/use-cases/GetLevelsUseCase.js';
import type { GetLevelInput, GetLevelOutput } from '../../../src/application/level-catalog/use-cases/GetLevelUseCase.js';
import type { CreateLevelInput, CreateLevelOutput } from '../../../src/application/level-catalog/use-cases/CreateLevelUseCase.js';
import type { UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput } from '../../../src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.js';
import type { PublishLevelInput, PublishLevelOutput } from '../../../src/application/level-catalog/use-cases/PublishLevelUseCase.js';
import type { ArchiveLevelInput, ArchiveLevelOutput } from '../../../src/application/level-catalog/use-cases/ArchiveLevelUseCase.js';
import type { TokenService } from '../../../src/application/identity/ports/TokenService.js';
import { NotFoundError } from '../../../src/shared/errors/ApplicationError.js';
import { InvalidArgumentError } from '../../../src/domain/errors/DomainError.js';
import { createLevelCatalogTestApp } from '../../helpers/createLevelCatalogTestApp.js';

const LEVEL_DTO: GetLevelOutput['level'] = {
  levelId: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Easy Start',
  description: 'A simple level for beginners',
  difficulty: 'EASY',
  status: 'PUBLISHED',
  version: 1,
  definition: {
    attempts: 5,
    arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'UP' }],
  },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

class FakeGetLevelsUseCase implements UseCase<GetLevelsInput, GetLevelsOutput> {
  async execute(_input: GetLevelsInput): Promise<GetLevelsOutput> { return { levels: [] }; }
}

class FakeGetLevelUseCase implements UseCase<GetLevelInput, GetLevelOutput> {
  error: Error | null = null;
  async execute(_input: GetLevelInput): Promise<GetLevelOutput> {
    if (this.error) throw this.error;
    return { level: LEVEL_DTO };
  }
}

class FakeCreateLevelUseCase implements UseCase<CreateLevelInput, CreateLevelOutput> {
  async execute(_input: CreateLevelInput): Promise<CreateLevelOutput> { return { levelId: 'new-id' }; }
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
  verify(_token: string): { userId: string; role: string } {
    return { userId: 'u-1', role: 'USER' };
  }
  generate(_payload: { userId: string; role: string }): string { return 'token'; }
}

function buildApp(getLevelUseCase: FakeGetLevelUseCase = new FakeGetLevelUseCase()) {
  return createLevelCatalogTestApp(
    new FakeGetLevelsUseCase(),
    getLevelUseCase,
    new FakeCreateLevelUseCase(),
    new FakeUpdateDefinitionUseCase(),
    new FakePublishUseCase(),
    new FakeArchiveUseCase(),
    new FakeTokenService(),
  );
}

describe('GET /levels/:levelId', () => {
  it('should_return_200_with_level_detail_when_level_exists', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).get('/levels/550e8400-e29b-41d4-a716-446655440001');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.level.levelId).toBe('550e8400-e29b-41d4-a716-446655440001');
  });

  it('should_return_level_detail_fields_when_level_is_found', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).get('/levels/550e8400-e29b-41d4-a716-446655440001');

    // Assert
    expect(res.status).toBe(200);
    const level = res.body.data.level;
    expect(level).toHaveProperty('levelId');
    expect(level).toHaveProperty('name');
    expect(level).toHaveProperty('description');
    expect(level).toHaveProperty('difficulty');
    expect(level).toHaveProperty('status');
    expect(level).toHaveProperty('version');
    expect(level).toHaveProperty('definition');
    expect(level).toHaveProperty('createdAt');
    expect(level).toHaveProperty('updatedAt');
  });

  it('should_return_404_when_level_does_not_exist', async () => {
    // Arrange
    const getLevelUseCase = new FakeGetLevelUseCase();
    getLevelUseCase.error = new NotFoundError('Level not found: non-existent');
    const app = buildApp(getLevelUseCase);

    // Act
    const res = await request(app).get('/levels/non-existent');

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should_return_422_when_levelId_is_not_a_valid_uuid', async () => {
    // Arrange
    const getLevelUseCase = new FakeGetLevelUseCase();
    getLevelUseCase.error = new InvalidArgumentError('Invalid UUID: not-a-uuid');
    const app = buildApp(getLevelUseCase);

    // Act
    const res = await request(app).get('/levels/not-a-uuid');

    // Assert
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_ARGUMENT');
  });

  it('should_return_200_without_authorization_header', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).get('/levels/550e8400-e29b-41d4-a716-446655440001');

    // Assert
    expect(res.status).toBe(200);
  });
});
