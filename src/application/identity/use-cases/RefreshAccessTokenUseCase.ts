import { RefreshToken } from "../../../domain/identity/RefreshToken.js";
import { RefreshTokenId } from "../../../domain/identity/value-objects/RefreshTokenId.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { Clock } from "../../ports/Clock.js";
import type { IdGenerator } from "../../ports/IdGenerator.js";
import { UnauthorizedError } from "../../../shared/errors/ApplicationError.js";
import type { RefreshTokenGenerator } from "../ports/RefreshTokenGenerator.js";
import type { RefreshTokenRepository } from "../ports/RefreshTokenRepository.js";
import type { TokenService } from "../ports/TokenService.js";
import type { UserRepository } from "../ports/UserRepository.js";

export type RefreshAccessTokenInput = {
  refreshToken: string;
};

export type RefreshAccessTokenOutput = {
  accessToken: string;
  refreshToken: string;
};

export class RefreshAccessTokenUseCase
  implements UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput>
{
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly tokenService: TokenService,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly refreshTtlMs: number,
  ) {}

  async execute(input: RefreshAccessTokenInput): Promise<RefreshAccessTokenOutput> {
    const presentedHash = this.refreshTokenGenerator.hash(input.refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(presentedHash);
    if (stored === null) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const now = this.clock.now();

    if (stored.isRevoked()) {
      // A revoked token being replayed means a leaked/rotated token: revoke the
      // whole family for that user as a theft response.
      await this.refreshTokenRepository.revokeAllForUser(stored.userId, now);
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (stored.isExpired(now)) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await this.userRepository.findById(stored.userId);
    if (user === null || !user.isActive) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const rawRefreshToken = this.refreshTokenGenerator.generate();
    const newTokenId = RefreshTokenId.create(this.idGenerator.generate());
    const rotated = RefreshToken.issue(
      newTokenId,
      stored.userId,
      this.refreshTokenGenerator.hash(rawRefreshToken),
      now,
      this.refreshTtlMs,
    );
    await this.refreshTokenRepository.save(rotated);

    stored.revoke(now, newTokenId);
    await this.refreshTokenRepository.save(stored);

    const accessToken = this.tokenService.generate({
      userId: user.id.value,
      role: user.role,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
