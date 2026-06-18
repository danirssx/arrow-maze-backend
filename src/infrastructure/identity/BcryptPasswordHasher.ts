// Pattern: Adapter
import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../../application/identity/ports/PasswordHasher.js";
import { PasswordHash } from "../../domain/identity/value-objects/PasswordHash.js";
import type { RawPassword } from "../../domain/identity/value-objects/RawPassword.js";

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly saltRounds: number = 12) {}

  async hash(raw: RawPassword): Promise<PasswordHash> {
    const hash = await bcrypt.hash(raw.value, this.saltRounds);
    return PasswordHash.fromHash(hash);
  }

  async verify(raw: RawPassword, stored: PasswordHash): Promise<boolean> {
    return bcrypt.compare(raw.value, stored.value);
  }
}
