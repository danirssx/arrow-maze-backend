import type { PasswordHash } from "../../../domain/identity/value-objects/PasswordHash.js";
import type { RawPassword } from "../../../domain/identity/value-objects/RawPassword.js";

export interface PasswordHasher {
  hash(raw: RawPassword): Promise<PasswordHash>;
  verify(raw: RawPassword, stored: PasswordHash): Promise<boolean>;
}
