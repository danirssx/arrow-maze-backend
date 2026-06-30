import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { LevelCatalogController } from '../../../src/framework/level-catalog/LevelCatalogController.js';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { GetLevelsInput, GetLevelsOutput } from '../../../src/application/level-catalog/use-cases/GetLevelsUseCase.js';
import type { GetLevelInput, GetLevelOutput } from '../../../src/application/level-catalog/use-cases/GetLevelUseCase.js';
import type { CreateLevelInput, CreateLevelOutput } from '../../../src/application/level-catalog/use-cases/CreateLevelUseCase.js';
import type { UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput } from '../../../src/application/level-catalog/use-cases/UpdateLevelDefinitionUseCase.js';
import type { PublishLevelInput, PublishLevelOutput } from '../../../src/application/level-catalog/use-cases/PublishLevelUseCase.js';
import type { ArchiveLevelInput, ArchiveLevelOutput } from '../../../src/application/level-catalog/use-cases/ArchiveLevelUseCase.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../src/shared/errors/ApplicationError.js';

function makeRes(): jest.Mocked<Response> {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as jest.Mocked<Response>;
}
function makeNext(): jest.MockedFunction<NextFunction> {
  return jest.fn() as jest.MockedFunction<NextFunction>;
}

const ADMIN_REQ = { params: {}, body: {}, user: { userId: 'u-admin', role: 'ADMIN' } } as unknown as Request;
const USER_REQ  = { params: {}, body: {}, user: { userId: 'u-1',     role: 'USER'  } } as unknown as Request;

function fakeUseCase<I, O>(resolved: O): jest.Mocked<UseCase<I, O>> {
  return { execute: jest.fn().mockResolvedValue(resolved) } as unknown as jest.Mocked<UseCase<I, O>>;
}

const LEVEL_DETAIL: GetLevelOutput['level'] = {
  levelId: 'l-1',
  name: 'n',
  description: 'd',
  difficulty: 'EASY',
  status: 'PUBLISHED',
  version: 1,
  definition: {
    attempts: 5,
    arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'UP' }],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeController() {
  return new LevelCatalogController(
    fakeUseCase<GetLevelsInput, GetLevelsOutput>({ levels: [] }),
    fakeUseCase<GetLevelInput, GetLevelOutput>({ level: LEVEL_DETAIL }),
    fakeUseCase<CreateLevelInput, CreateLevelOutput>({ levelId: 'new-id' }),
    fakeUseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput>({ levelId: 'l-1' }),
    fakeUseCase<PublishLevelInput, PublishLevelOutput>({ levelId: 'l-1' }),
    fakeUseCase<ArchiveLevelInput, ArchiveLevelOutput>({ levelId: 'l-1' }),
  );
}

function makeControllerWithOverrides(overrides: {
  createLevelUseCase?: UseCase<CreateLevelInput, CreateLevelOutput>;
  updateDefinitionUseCase?: UseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput>;
  publishLevelUseCase?: UseCase<PublishLevelInput, PublishLevelOutput>;
  archiveLevelUseCase?: UseCase<ArchiveLevelInput, ArchiveLevelOutput>;
} = {}) {
  return new LevelCatalogController(
    fakeUseCase<GetLevelsInput, GetLevelsOutput>({ levels: [] }),
    fakeUseCase<GetLevelInput, GetLevelOutput>({ level: LEVEL_DETAIL }),
    overrides.createLevelUseCase ?? fakeUseCase<CreateLevelInput, CreateLevelOutput>({ levelId: 'new-id' }),
    overrides.updateDefinitionUseCase ?? fakeUseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput>({ levelId: 'l-1' }),
    overrides.publishLevelUseCase ?? fakeUseCase<PublishLevelInput, PublishLevelOutput>({ levelId: 'l-1' }),
    overrides.archiveLevelUseCase ?? fakeUseCase<ArchiveLevelInput, ArchiveLevelOutput>({ levelId: 'l-1' }),
  );
}

describe('LevelCatalogController', () => {
  describe('listLevels', () => {
    it('should_return_200_with_levels_list_when_called', async () => {
      // Arrange
      const controller = makeController();
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.listLevels({} as Request, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getLevel', () => {
    it('should_return_200_with_level_when_found', async () => {
      // Arrange
      const controller = makeController();
      const req = { params: { levelId: 'l-1' } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.getLevel(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('should_call_next_with_not_found_when_level_does_not_exist', async () => {
      // Arrange
      const getLevelUseCase = fakeUseCase<GetLevelInput, GetLevelOutput>({ level: LEVEL_DETAIL });
      (getLevelUseCase.execute as jest.Mock).mockRejectedValue(new NotFoundError('not found'));
      const controller = new LevelCatalogController(
        fakeUseCase<GetLevelsInput, GetLevelsOutput>({ levels: [] }),
        getLevelUseCase,
        fakeUseCase<CreateLevelInput, CreateLevelOutput>({ levelId: 'new-id' }),
        fakeUseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput>({ levelId: 'l-1' }),
        fakeUseCase<PublishLevelInput, PublishLevelOutput>({ levelId: 'l-1' }),
        fakeUseCase<ArchiveLevelInput, ArchiveLevelOutput>({ levelId: 'l-1' }),
      );
      const req = { params: { levelId: 'bad-id' } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.getLevel(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('updateDefinition', () => {
    it('should_forward_forbidden_when_application_rejects_non_admin_update', async () => {
      // Arrange
      const updateDefinitionUseCase = fakeUseCase<UpdateLevelDefinitionInput, UpdateLevelDefinitionOutput>({ levelId: 'l-1' });
      (updateDefinitionUseCase.execute as jest.Mock).mockRejectedValue(new ForbiddenError('Admin access required'));
      const controller = makeControllerWithOverrides({ updateDefinitionUseCase });
      const req = { ...USER_REQ, params: { levelId: 'l-1' }, body: { arrows: [] } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.updateDefinition(req, res, next);

      // Assert
      expect(updateDefinitionUseCase.execute).toHaveBeenCalledWith({
        actorRole: 'USER',
        levelId: 'l-1',
        arrows: [],
      });
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should_return_400_when_arrows_are_missing', async () => {
      // Arrange
      const controller = makeController();
      const req = { ...ADMIN_REQ, params: { levelId: 'l-1' }, body: {} } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.updateDefinition(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should_return_200_when_admin_updates_definition_successfully', async () => {
      // Arrange
      const controller = makeController();
      const req = {
        ...ADMIN_REQ,
        params: { levelId: 'l-1' },
        body: { arrows: [{ id: 'a', color: '#5262FB', path: [{ row: 0, col: 0 }], direction: 'UP' }], attempts: 5 },
      } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.updateDefinition(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('publishLevel', () => {
    it('should_forward_forbidden_when_application_rejects_non_admin_publish', async () => {
      // Arrange
      const publishLevelUseCase = fakeUseCase<PublishLevelInput, PublishLevelOutput>({ levelId: 'l-1' });
      (publishLevelUseCase.execute as jest.Mock).mockRejectedValue(new ForbiddenError('Admin access required'));
      const controller = makeControllerWithOverrides({ publishLevelUseCase });
      const req = { ...USER_REQ, params: { levelId: 'l-1' } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.publishLevel(req, res, next);

      // Assert
      expect(publishLevelUseCase.execute).toHaveBeenCalledWith({ actorRole: 'USER', levelId: 'l-1' });
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should_return_200_when_admin_publishes_level_successfully', async () => {
      // Arrange
      const controller = makeController();
      const req = { ...ADMIN_REQ, params: { levelId: 'l-1' } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.publishLevel(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('archiveLevel', () => {
    it('should_forward_forbidden_when_application_rejects_non_admin_archive', async () => {
      // Arrange
      const archiveLevelUseCase = fakeUseCase<ArchiveLevelInput, ArchiveLevelOutput>({ levelId: 'l-1' });
      (archiveLevelUseCase.execute as jest.Mock).mockRejectedValue(new ForbiddenError('Admin access required'));
      const controller = makeControllerWithOverrides({ archiveLevelUseCase });
      const req = { ...USER_REQ, params: { levelId: 'l-1' } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.archiveLevel(req, res, next);

      // Assert
      expect(archiveLevelUseCase.execute).toHaveBeenCalledWith({ actorRole: 'USER', levelId: 'l-1' });
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should_return_200_when_admin_archives_level_successfully', async () => {
      // Arrange
      const controller = makeController();
      const req = { ...ADMIN_REQ, params: { levelId: 'l-1' } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.archiveLevel(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
