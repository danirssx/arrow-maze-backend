// Pattern: Controller
import type { NextFunction, Request, Response } from "express";
import type { LoginInput, LoginOutput } from "../../application/identity/use-cases/LoginUseCase.js";
import type { RegisterUserInput, RegisterUserOutput } from "../../application/identity/use-cases/RegisterUserUseCase.js";
import type { UseCase } from "../../application/aspects/UseCase.js";
import { BadRequestError } from "../../shared/errors/ApplicationError.js";
import { ApiResponsePresenter } from "../errors/ApiResponsePresenter.js";

export class IdentityController {
  constructor(
    private readonly registerUseCase: UseCase<RegisterUserInput, RegisterUserOutput>,
    private readonly loginUseCase: UseCase<LoginInput, LoginOutput>
  ) {}

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, rawPassword } = req.body as Record<string, unknown>;

      if (!email || !username || !rawPassword) {
        throw new BadRequestError("email, username and rawPassword are required");
      }

      const result = await this.registerUseCase.execute({
        email: String(email),
        username: String(username),
        rawPassword: String(rawPassword)
      });

      res.status(201).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, rawPassword } = req.body as Record<string, unknown>;

      if (!email || !rawPassword) {
        throw new BadRequestError("email and rawPassword are required");
      }

      const result = await this.loginUseCase.execute({
        email: String(email),
        rawPassword: String(rawPassword)
      });

      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }
}
