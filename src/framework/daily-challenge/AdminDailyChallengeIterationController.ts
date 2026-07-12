// Pattern: Controller
import type { NextFunction, Request, Response } from "express";
import type { UseCase } from "../../application/aspects/UseCase.js";
import { InvalidDailyChallengeDateError } from "../../application/daily-challenge/DailyChallengeIterationErrors.js";
import type {
  StartDailyChallengeIterationInput,
  StartDailyChallengeIterationOutput,
} from "../../application/daily-challenge/use-cases/StartDailyChallengeIterationUseCase.js";
import type {
  GetDailyChallengeIterationInput,
  GetDailyChallengeIterationOutput,
} from "../../application/daily-challenge/use-cases/GetDailyChallengeIterationUseCase.js";
import { ApiResponsePresenter } from "../errors/ApiResponsePresenter.js";

const ITERATION_IN_PROGRESS_CODE = "DAILY_CHALLENGE_ITERATION_IN_PROGRESS";
const ITERATION_IN_PROGRESS_MESSAGE = "Daily challenge iteration already in progress";

/**
 * Admin-only manual daily-challenge iteration endpoints (MAZ-224). The routes are
 * guarded by `authMiddleware` + `requireAdmin`; this controller only parses
 * transport input and maps the use-case result to HTTP status codes. A start
 * that finds an in-progress operation for the same date returns 409 with the
 * running operation summary; a fresh start returns 202 with the RUNNING snapshot.
 */
export class AdminDailyChallengeIterationController {
  constructor(
    private readonly startIterationUseCase: UseCase<
      StartDailyChallengeIterationInput,
      StartDailyChallengeIterationOutput
    >,
    private readonly getIterationUseCase: UseCase<
      GetDailyChallengeIterationInput,
      GetDailyChallengeIterationOutput
    >
  ) {}

  async startIteration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = AdminDailyChallengeIterationController.parseStartInput(req.body);
      const result = await this.startIterationUseCase.execute(input);
      if (result.alreadyRunning) {
        res.status(409).json(
          ApiResponsePresenter.errorWithData(ITERATION_IN_PROGRESS_CODE, ITERATION_IN_PROGRESS_MESSAGE, {
            operation: {
              operationId: result.operation.operationId,
              date: result.operation.date,
              status: result.operation.status,
            },
          })
        );
        return;
      }
      res.status(202).json(ApiResponsePresenter.success({ operation: result.operation }));
    } catch (err) {
      next(err);
    }
  }

  async getIteration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operationId = String(req.params["operationId"]);
      const result = await this.getIterationUseCase.execute({ operationId });
      res.status(200).json(ApiResponsePresenter.success({ operation: result.operation }));
    } catch (err) {
      next(err);
    }
  }

  private static parseStartInput(body: unknown): StartDailyChallengeIterationInput {
    if (body === undefined || body === null) return {};
    if (typeof body !== "object") {
      throw new InvalidDailyChallengeDateError();
    }
    const date = (body as Record<string, unknown>)["date"];
    if (date === undefined) return {};
    if (typeof date !== "string") {
      throw new InvalidDailyChallengeDateError();
    }
    return { date };
  }
}
