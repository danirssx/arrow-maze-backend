import express from 'express';
import type { UseCase } from '../../src/application/aspects/UseCase.js';
import type { GetLevelsInput, GetLevelsOutput } from '../../src/application/level-catalog/use-cases/GetLevelsUseCase.js';
import type { GetLevelInput, GetLevelOutput } from '../../src/application/level-catalog/use-cases/GetLevelUseCase.js';
import type { CreateLevelInput, CreateLevelOutput } from '../../src/application/level-catalog/use-cases/CreateLevelUseCase.js';
import type { UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput } from '../../src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.js';
import type { PublishLevelInput, PublishLevelOutput } from '../../src/application/level-catalog/use-cases/PublishLevelUseCase.js';
import type { ArchiveLevelInput, ArchiveLevelOutput } from '../../src/application/level-catalog/use-cases/ArchiveLevelUseCase.js';
import type { TokenService } from '../../src/application/identity/ports/TokenService.js';
import { ConsoleLogger } from '../../src/infrastructure/logging/ConsoleLogger.js';
import { createErrorMiddleware } from '../../src/framework/errors/errorMiddleware.js';
import { createAuthMiddleware } from '../../src/framework/middleware/authMiddleware.js';
import { LevelCatalogController } from '../../src/framework/level-catalog/LevelCatalogController.js';
import { createLevelCatalogRouter } from '../../src/framework/level-catalog/levelCatalogRoutes.js';

export function createLevelCatalogTestApp(
  getLevelsUseCase: UseCase<GetLevelsInput, GetLevelsOutput>,
  getLevelUseCase: UseCase<GetLevelInput, GetLevelOutput>,
  createLevelUseCase: UseCase<CreateLevelInput, CreateLevelOutput>,
  updateDefinitionUseCase: UseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput>,
  publishLevelUseCase: UseCase<PublishLevelInput, PublishLevelOutput>,
  archiveLevelUseCase: UseCase<ArchiveLevelInput, ArchiveLevelOutput>,
  tokenService: TokenService,
) {
  const app = express();
  app.use(express.json());
  const controller = new LevelCatalogController(
    getLevelsUseCase,
    getLevelUseCase,
    createLevelUseCase,
    updateDefinitionUseCase,
    publishLevelUseCase,
    archiveLevelUseCase,
  );
  const auth = createAuthMiddleware(tokenService);
  app.use(createLevelCatalogRouter(controller, auth));
  app.use(createErrorMiddleware(new ConsoleLogger()));
  return app;
}
