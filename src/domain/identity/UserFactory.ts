// Pattern: Factory
import { User } from "./User.js";
import { UserRole } from "./enums/UserRole.js";
import type { Email } from "./value-objects/Email.js";
import type { PasswordHash } from "./value-objects/PasswordHash.js";
import { UserId } from "./value-objects/UserId.js";
import type { Username } from "./value-objects/Username.js";

export class UserFactory {
  static create(
    email: Email,
    username: Username,
    passwordHash: PasswordHash,
    role: UserRole = UserRole.USER
  ): User {
    return User.register(UserId.generate(), email, username, passwordHash, role);
  }
}
