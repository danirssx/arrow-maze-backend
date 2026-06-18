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
import { createLevelCatalogTestApp } from '../../helpers/createLevelCatalogTestApp.js';

class FakeGetLevelsUseCase implements UseCase<GetLevelsInput, GetLevelsOutput> {
  result: GetLevelsOutput = {
    levels: [
      { levelId: '550e8400-e29b-41d4-a716-446655440001', name: 'Easy Start', difficulty: 'EASY', createdAt: new Date('2026-01-01') },
    ],
  };
  async execute(_input: GetLevelsInput): Promise<GetLevelsOutput> {
    return this.result;
  }
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

function buildApp() {
  return createLevelCatalogTestApp(
    new FakeGetLevelsUseCase(),
    new FakeGetLevelUseCase(),
    new FakeCreateLevelUseCase(),
    new FakeUpdateDefinitionUseCase(),
    new FakePublishUseCase(),
    new FakeArchiveUseCase(),
    new FakeTokenService(),
  );
}

describe('GET /levels', () => {
  it('should_return_200_with_levels_list_when_levels_exist', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).get('/levels');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.levels)).toBe(true);
    expect(res.body.data.levels[0].levelId).toBe('550e8400-e29b-41d4-a716-446655440001');
  });

  it('should_return_200_with_empty_list_when_no_levels_exist', async () => {
    // Arrange
    const getLevelsUseCase = new FakeGetLevelsUseCase();
    getLevelsUseCase.result = { levels: [] };
    const app = createLevelCatalogTestApp(
      getLevelsUseCase,
      new FakeGetLevelUseCase(),
      new FakeCreateLevelUseCase(),
      new FakeUpdateDefinitionUseCase(),
      new FakePublishUseCase(),
      new FakeArchiveUseCase(),
      new FakeTokenService(),
    );

    // Act
    const res = await request(app).get('/levels');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.levels).toHaveLength(0);
  });

  it('should_return_200_without_authorization_header', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).get('/levels');

    // Assert
    expect(res.status).toBe(200);
  });

  it('should_return_level_summary_fields_when_levels_are_listed', async () => {
    // Arrange
    const app = buildApp();

    // Act
    const res = await request(app).get('/levels');

    // Assert
    expect(res.status).toBe(200);
    const level = res.body.data.levels[0];
    expect(level).toHaveProperty('levelId');
    expect(level).toHaveProperty('name');
    expect(level).toHaveProperty('difficulty');
    expect(level).toHaveProperty('createdAt');
  });
});
