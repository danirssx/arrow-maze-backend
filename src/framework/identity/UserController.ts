// Pattern: Controller
import type { NextFunction, Request, Response } from "express";
import type { UseCase } from "../../application/aspects/UseCase.js";
import type {
  GetCurrentUserInput,
  GetCurrentUserOutput,
} from "../../application/identity/use-cases/GetCurrentUserUseCase.js";
import { ApiResponsePresenter } from "../errors/ApiResponsePresenter.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class UserController {
  constructor(
    private readonly getCurrentUserUseCase: UseCase<GetCurrentUserInput, GetCurrentUserOutput>
  ) {}

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const result = await this.getCurrentUserUseCase.execute({ userId });
      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }
}
