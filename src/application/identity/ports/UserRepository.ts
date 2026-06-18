import type { User } from "../../../domain/identity/User.js";
import type { Email } from "../../../domain/identity/value-objects/Email.js";
import type { Username } from "../../../domain/identity/value-objects/Username.js";
import type { UserId } from "../../../domain/shared/UserId.js";

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  existsByUsername(username: Username): Promise<boolean>;
}
