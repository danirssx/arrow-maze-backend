// Pattern: Factory
import { User } from "./User.js";
import { UserRole } from "./enums/UserRole.js";
import type { Email } from "./value-objects/Email.js";
import type { PasswordHash } from "./value-objects/PasswordHash.js";
import type { UserId } from "../shared/UserId.js";
import type { Username } from "./value-objects/Username.js";

export class UserFactory {
  static create(
    id: UserId,
    email: Email,
    username: Username,
    passwordHash: PasswordHash,
    now: Date,
    role: UserRole = UserRole.USER,
  ): User {
    return User.register(id, email, username, passwordHash, role, now);
  }
}
