// Pattern: Controller
import type { NextFunction, Request, Response } from "express";
import type { UseCase } from "../../application/aspects/UseCase.js";
import type {
  GetDailyChallengeInput,
  GetDailyChallengeOutput,
} from "../../application/daily-challenge/use-cases/GetDailyChallengeUseCase.js";
import { ApiResponsePresenter } from "../errors/ApiResponsePresenter.js";

export class DailyChallengeController {
  constructor(
    private readonly getDailyChallengeUseCase: UseCase<
      GetDailyChallengeInput,
      GetDailyChallengeOutput
    >
  ) {}

  async getDailyChallenge(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getDailyChallengeUseCase.execute({});
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }
}
