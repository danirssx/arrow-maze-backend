// Pattern: Adapter
import { createHash, randomBytes } from "node:crypto";
import type { RefreshTokenGenerator } from "../../application/identity/ports/RefreshTokenGenerator.js";

/**
 * Opaque refresh tokens: a high-entropy random value handed to the client, and a
 * one-way SHA-256 hash kept in the database. A DB leak therefore exposes no
 * usable token, and lookup is by hash.
 */
export class CryptoRefreshTokenGenerator implements RefreshTokenGenerator {
  constructor(private readonly byteLength: number = 32) {}

  generate(): string {
    return randomBytes(this.byteLength).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
