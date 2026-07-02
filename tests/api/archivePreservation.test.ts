import express from 'express';
import request from 'supertest';
import type { UseCase } from '../../src/application/aspects/UseCase.js';
import type { GetLeaderboardInput, GetLeaderboardOutput } from '../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { SubmitScoreInput } from '../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import type { GetLevelsInput, GetLevelsOutput } from '../../src/application/level-catalog/use-cases/GetLevelsUseCase.js';
import type { GetLevelInput, GetLevelOutput } from '../../src/application/level-catalog/use-cases/GetLevelUseCase.js';
import type { CreateLevelInput, CreateLevelOutput } from '../../src/application/level-catalog/use-cases/CreateLevelUseCase.js';
import type { UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput } from '../../src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.js';
import type { PublishLevelInput, PublishLevelOutput } from '../../src/application/level-catalog/use-cases/PublishLevelUseCase.js';
import type { ArchiveLevelInput, ArchiveLevelOutput } from '../../src/application/level-catalog/use-cases/ArchiveLevelUseCase.js';
import type { TokenService } from '../../src/application/identity/ports/TokenService.js';
import { createLeaderboardRouter } from '../../src/framework/leaderboard/leaderboardRoutes.js';
import { LeaderboardController } from '../../src/framework/leaderboard/LeaderboardController.js';
import { createLevelCatalogRouter } from '../../src/framework/level-catalog/levelCatalogRoutes.js';
import { LevelCatalogController } from '../../src/framework/level-catalog/LevelCatalogController.js';
import { createAuthMiddleware } from '../../src/framework/middleware/authMiddleware.js';
import { createErrorMiddleware } from '../../src/framework/errors/errorMiddleware.js';
import { ConsoleLogger } from '../../src/infrastructure/logging/ConsoleLogger.js';

const ARCHIVED_LEVEL_ID = '550e8400-e29b-41d4-a716-446655440010';

class FakeGetLevelsUseCase implements UseCase<GetLevelsInput, GetLevelsOutput> {
  async execute(_input: GetLevelsInput): Promise<GetLevelsOutput> {
    return {
      levels: [
        {
          levelId: '550e8400-e29b-41d4-a716-446655440011',
          name: 'Visible Level',
          difficulty: 'EASY',
          arrowCount: 1,
          attempts: 5,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    };
  }
}

class FakeGetLeaderboardUseCase implements UseCase<GetLeaderboardInput, GetLeaderboardOutput> {
  async execute(input: GetLeaderboardInput): Promise<GetLeaderboardOutput> {
    return {
      leaderboardId: '550e8400-e29b-41d4-a716-446655440020',
      levelId: input.levelId,
      entries: [
        {
          entryId: '550e8400-e29b-41d4-a716-446655440030',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          usernameSnapshot: 'archived_player',
          score: 980,
          timeSeconds: 18,
          movesCount: 4,
          rank: 1,
          submittedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    };
  }
}

class NoopGetLevelUseCase implements UseCase<GetLevelInput, GetLevelOutput> {
  async execute(_input: GetLevelInput): Promise<GetLevelOutput> {
    throw new Error('not used');
  }
}

class NoopCreateLevelUseCase implements UseCase<CreateLevelInput, CreateLevelOutput> {
  async execute(_input: CreateLevelInput): Promise<CreateLevelOutput> {
    throw new Error('not used');
  }
}

class NoopUpdateDefinitionUseCase implements UseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput> {
  async execute(_input: UpdateLevelDefinitionInput): Promise<UpdateLevelDefinitionOutput> {
    throw new Error('not used');
  }
}

class NoopPublishLevelUseCase implements UseCase<PublishLevelInput, PublishLevelOutput> {
  async execute(_input: PublishLevelInput): Promise<PublishLevelOutput> {
    throw new Error('not used');
  }
}

class NoopArchiveLevelUseCase implements UseCase<ArchiveLevelInput, ArchiveLevelOutput> {
  async execute(_input: ArchiveLevelInput): Promise<ArchiveLevelOutput> {
    throw new Error('not used');
  }
}

class NoopSubmitScoreUseCase implements UseCase<SubmitScoreInput, void> {
  async execute(_input: SubmitScoreInput): Promise<void> {}
}

class FakeTokenService implements TokenService {
  verify(_token: string): { userId: string; role: string } {
    return { userId: '550e8400-e29b-41d4-a716-446655440001', role: 'ADMIN' };
  }
  generate(_payload: { userId: string; role: string }): string {
    return 'token';
  }
}

function createArchivePreservationApp() {
  const app = express();
  app.use(express.json());

  const auth = createAuthMiddleware(new FakeTokenService());
  app.use(
    createLevelCatalogRouter(
      new LevelCatalogController(
        new FakeGetLevelsUseCase(),
        new NoopGetLevelUseCase(),
        new NoopCreateLevelUseCase(),
        new NoopUpdateDefinitionUseCase(),
        new NoopPublishLevelUseCase(),
        new NoopArchiveLevelUseCase(),
      ),
      auth,
    ),
  );
  app.use(
    createLeaderboardRouter(
      new LeaderboardController(new NoopSubmitScoreUseCase(), new FakeGetLeaderboardUseCase()),
      auth,
    ),
  );
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}

describe('archived level score preservation API contract', () => {
  it('should_hide_archived_level_from_public_catalog_but_keep_leaderboard_readable', async () => {
    // Arrange
    const app = createArchivePreservationApp();

    // Act
    const levelsResponse = await request(app).get('/levels');
    const leaderboardResponse = await request(app).get(`/leaderboard/${ARCHIVED_LEVEL_ID}`);

    // Assert
    expect(levelsResponse.status).toBe(200);
    expect(levelsResponse.body.data.levels).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ levelId: ARCHIVED_LEVEL_ID })]),
    );
    expect(leaderboardResponse.status).toBe(200);
    expect(leaderboardResponse.body.data.levelId).toBe(ARCHIVED_LEVEL_ID);
    expect(leaderboardResponse.body.data.entries).toHaveLength(1);
    expect(leaderboardResponse.body.data.entries[0].usernameSnapshot).toBe('archived_player');
  });
});
