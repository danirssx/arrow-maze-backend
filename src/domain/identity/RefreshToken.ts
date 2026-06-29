// Pattern: Aggregate Root
import { Entity } from "../shared/Entity.js";
import type { UserId } from "../shared/UserId.js";
import type { RefreshTokenId } from "./value-objects/RefreshTokenId.js";

/**
 * A persisted, revocable refresh token. The opaque token string never lives here
 * — only its hash. Lifecycle invariants (expiry, revocation, rotation link) live
 * in this entity; randomness/hashing/clock are infrastructure/application concerns.
 */
export class RefreshToken extends Entity<RefreshTokenId> {
  private constructor(
    id: RefreshTokenId,
    private readonly _userId: UserId,
    private readonly _tokenHash: string,
    private readonly _expiresAt: Date,
    private readonly _createdAt: Date,
    private _revokedAt: Date | null,
    private _replacedByTokenId: RefreshTokenId | null,
  ) {
    super(id);
  }

  static issue(
    id: RefreshTokenId,
    userId: UserId,
    tokenHash: string,
    now: Date,
    ttlMs: number,
  ): RefreshToken {
    const expiresAt = new Date(now.getTime() + ttlMs);
    return new RefreshToken(id, userId, tokenHash, expiresAt, now, null, null);
  }

  static reconstitute(
    id: RefreshTokenId,
    userId: UserId,
    tokenHash: string,
    expiresAt: Date,
    createdAt: Date,
    revokedAt: Date | null,
    replacedByTokenId: RefreshTokenId | null,
  ): RefreshToken {
    return new RefreshToken(id, userId, tokenHash, expiresAt, createdAt, revokedAt, replacedByTokenId);
  }

  isRevoked(): boolean {
    return this._revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this._expiresAt.getTime();
  }

  isActive(now: Date): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }

  revoke(now: Date, replacedByTokenId: RefreshTokenId | null = null): void {
    if (this._revokedAt !== null) return;
    this._revokedAt = now;
    this._replacedByTokenId = replacedByTokenId;
  }

  get userId(): UserId { return this._userId; }
  get tokenHash(): string { return this._tokenHash; }
  get expiresAt(): Date { return this._expiresAt; }
  get createdAt(): Date { return this._createdAt; }
  get revokedAt(): Date | null { return this._revokedAt; }
  get replacedByTokenId(): RefreshTokenId | null { return this._replacedByTokenId; }
}
