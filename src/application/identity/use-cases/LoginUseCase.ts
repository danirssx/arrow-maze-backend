import { Email } from "../../../domain/identity/value-objects/Email.js";
import { RawPassword } from "../../../domain/identity/value-objects/RawPassword.js";
import { RefreshToken } from "../../../domain/identity/RefreshToken.js";
import { RefreshTokenId } from "../../../domain/identity/value-objects/RefreshTokenId.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { Clock } from "../../ports/Clock.js";
import type { IdGenerator } from "../../ports/IdGenerator.js";
import { ForbiddenError, UnauthorizedError } from "../../../shared/errors/ApplicationError.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import type { RefreshTokenGenerator } from "../ports/RefreshTokenGenerator.js";
import type { RefreshTokenRepository } from "../ports/RefreshTokenRepository.js";
import type { TokenService } from "../ports/TokenService.js";
import type { UserRepository } from "../ports/UserRepository.js";

export type LoginInput = {
  email: string;
  rawPassword: string;
};

export type LoginOutput = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
  role: string;
};

export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly refreshTtlMs: number,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    let email: Email;
    let rawPassword: RawPassword;

    try {
      email = Email.create(input.email);
      rawPassword = RawPassword.create(input.rawPassword);
    } catch {
      throw new UnauthorizedError("Invalid credentials");
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.isActive) {
      throw new ForbiddenError("Account is suspended");
    }

    const isValid = await this.passwordHasher.verify(rawPassword, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const accessToken = this.tokenService.generate({
      userId: user.id.value,
      role: user.role
    });

    const rawRefreshToken = this.refreshTokenGenerator.generate();
    const refreshToken = RefreshToken.issue(
      RefreshTokenId.create(this.idGenerator.generate()),
      user.id,
      this.refreshTokenGenerator.hash(rawRefreshToken),
      this.clock.now(),
      this.refreshTtlMs,
    );
    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      userId: user.id.value,
      username: user.username.value,
      role: user.role
    };
  }
}
