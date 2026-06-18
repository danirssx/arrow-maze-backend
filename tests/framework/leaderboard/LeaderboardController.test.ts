import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { LeaderboardController } from '../../../src/framework/leaderboard/LeaderboardController.js';
import type { UseCase } from '../../../src/application/aspects/UseCase.js';
import type { GetLeaderboardInput, GetLeaderboardOutput } from '../../../src/application/leaderboard/use-cases/GetLeaderboardService.js';
import type { SubmitScoreInput } from '../../../src/application/leaderboard/use-cases/SubmitScoreService.js';
import { BadRequestError, NotFoundError } from '../../../src/shared/errors/ApplicationError.js';

function makeRes(): jest.Mocked<Response> {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>;
  return res;
}

function makeNext(): jest.MockedFunction<NextFunction> {
  return jest.fn() as jest.MockedFunction<NextFunction>;
}

function makeSubmitUseCase(impl?: () => Promise<void>): jest.Mocked<UseCase<SubmitScoreInput, void>> {
  return { execute: jest.fn().mockImplementation(impl ?? (() => Promise.resolve())) } as unknown as jest.Mocked<UseCase<SubmitScoreInput, void>>;
}

function makeGetUseCase(output?: GetLeaderboardOutput): jest.Mocked<UseCase<GetLeaderboardInput, GetLeaderboardOutput>> {
  const defaultOutput: GetLeaderboardOutput = {
    leaderboardId: 'lb-1', levelId: 'level-1', entries: [], updatedAt: new Date(),
  };
  return { execute: jest.fn().mockResolvedValue(output ?? defaultOutput) } as unknown as jest.Mocked<UseCase<GetLeaderboardInput, GetLeaderboardOutput>>;
}

function makeController() {
  return new LeaderboardController(makeSubmitUseCase(), makeGetUseCase());
}

const validBody = {
  leaderboardId: 'lb-1', entryId: 'e-1', userId: 'u-1', levelId: 'level-1',
  usernameSnapshot: 'Player1', score: 100, timeSeconds: 30, movesCount: 15,
};

describe('LeaderboardController', () => {
  describe('submitScore', () => {
    it('should_return_201_when_score_submitted_successfully', async () => {
      // Arrange
      const controller = makeController();
      const req = { body: validBody } as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.submitScore(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('should_call_next_with_bad_request_when_required_field_missing', async () => {
      // Arrange
      const controller = makeController();
      const req = { body: { score: 100 } } as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.submitScore(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should_call_next_with_error_when_use_case_throws', async () => {
      // Arrange
      const submitUseCase = makeSubmitUseCase(() => Promise.reject(new Error('unexpected')));
      const controller = new LeaderboardController(submitUseCase, makeGetUseCase());
      const req = { body: validBody } as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.submitScore(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getLeaderboard', () => {
    it('should_return_200_with_leaderboard_when_found', async () => {
      // Arrange
      const controller = makeController();
      const req = { params: { levelId: 'level-1' } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.getLeaderboard(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('should_call_next_with_not_found_when_leaderboard_missing', async () => {
      // Arrange
      const getUseCase = makeGetUseCase();
      (getUseCase.execute as jest.Mock).mockRejectedValue(new NotFoundError('not found'));
      const controller = new LeaderboardController(makeSubmitUseCase(), getUseCase);
      const req = { params: { levelId: 'level-99' } } as unknown as Request;
      const res = makeRes();
      const next = makeNext();

      // Act
      await controller.getLeaderboard(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });
});
