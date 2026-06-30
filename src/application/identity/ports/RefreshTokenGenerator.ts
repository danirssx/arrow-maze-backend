export interface RefreshTokenGenerator {
  /** A new high-entropy opaque refresh token (the value handed to the client). */
  generate(): string;
  /** Deterministic hash of a token, used for storage and lookup (the raw token is never stored). */
  hash(token: string): string;
}
