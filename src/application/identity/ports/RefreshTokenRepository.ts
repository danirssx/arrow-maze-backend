import type { RefreshToken } from "../../../domain/identity/RefreshToken.js";
import type { UserId } from "../../../domain/shared/UserId.js";

export interface RefreshTokenRepository {
  save(token: RefreshToken): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeAllForUser(userId: UserId, now: Date): Promise<void>;
}
