// Pattern: Controller
import type { NextFunction, Request, Response } from "express";
import type { LoginInput, LoginOutput } from "../../application/identity/use-cases/LoginUseCase.js";
import type { RegisterUserInput, RegisterUserOutput } from "../../application/identity/use-cases/RegisterUserUseCase.js";
import type { LogoutInput } from "../../application/identity/use-cases/LogoutUseCase.js";
import type { RefreshAccessTokenInput, RefreshAccessTokenOutput } from "../../application/identity/use-cases/RefreshAccessTokenUseCase.js";
import type { UseCase } from "../../application/aspects/UseCase.js";
import { BadRequestError } from "../../shared/errors/ApplicationError.js";
import { ApiResponsePresenter } from "../errors/ApiResponsePresenter.js";

export class IdentityController {
  constructor(
    private readonly registerUseCase: UseCase<RegisterUserInput, RegisterUserOutput>,
    private readonly loginUseCase: UseCase<LoginInput, LoginOutput>,
    private readonly refreshUseCase: UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput>,
    private readonly logoutUseCase: UseCase<LogoutInput, void>,
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

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as Record<string, unknown>;

      if (!refreshToken) {
        throw new BadRequestError("refreshToken is required");
      }

      const result = await this.refreshUseCase.execute({ refreshToken: String(refreshToken) });

      res.status(200).json(ApiResponsePresenter.success(result));
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as Record<string, unknown>;

      if (!refreshToken) {
        throw new BadRequestError("refreshToken is required");
      }

      await this.logoutUseCase.execute({ refreshToken: String(refreshToken) });

      res.status(200).json(ApiResponsePresenter.success(null));
    } catch (err) {
      next(err);
    }
  }
}
