import type { UseCase } from "../../aspects/UseCase.js";
import type { Clock } from "../../ports/Clock.js";
import type { RefreshTokenGenerator } from "../ports/RefreshTokenGenerator.js";
import type { RefreshTokenRepository } from "../ports/RefreshTokenRepository.js";

export type LogoutInput = {
  refreshToken: string;
};

export class LogoutUseCase implements UseCase<LogoutInput, void> {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const presentedHash = this.refreshTokenGenerator.hash(input.refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(presentedHash);
    // Idempotent: unknown / already-revoked tokens are a silent no-op so logout
    // cannot be used to probe which tokens exist.
    if (stored === null) return;
    stored.revoke(this.clock.now());
    await this.refreshTokenRepository.save(stored);
  }
}
