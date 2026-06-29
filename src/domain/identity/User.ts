// Pattern: Aggregate Root
import { BusinessRuleViolationError } from "../errors/DomainError.js";
import { Entity } from "../shared/Entity.js";
import type { UserId } from "../shared/UserId.js";
import { UserRole } from "./enums/UserRole.js";
import { UserStatus } from "./enums/UserStatus.js";
import { UserPasswordChanged } from "./events/UserPasswordChanged.js";
import { UserRegistered } from "./events/UserRegistered.js";
import { UserSuspended } from "./events/UserSuspended.js";
import type { Email } from "./value-objects/Email.js";
import type { PasswordHash } from "./value-objects/PasswordHash.js";
import type { Username } from "./value-objects/Username.js";

export class User extends Entity<UserId> {
  private constructor(
    id: UserId,
    private readonly _email: Email,
    private readonly _username: Username,
    private _passwordHash: PasswordHash,
    private readonly _role: UserRole,
    private _status: UserStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    super(id);
  }

  static register(
    id: UserId,
    email: Email,
    username: Username,
    passwordHash: PasswordHash,
    role: UserRole = UserRole.USER,
    now: Date,
  ): User {
    const user = new User(id, email, username, passwordHash, role, UserStatus.ACTIVE, now, now);
    user.record(
      new UserRegistered(id.value, email.value, username.value, role, now)
    );
    return user;
  }

  static reconstitute(
    id: UserId,
    email: Email,
    username: Username,
    passwordHash: PasswordHash,
    role: UserRole,
    status: UserStatus,
    createdAt: Date,
    updatedAt: Date
  ): User {
    return new User(id, email, username, passwordHash, role, status, createdAt, updatedAt);
  }

  changePassword(newHash: PasswordHash, now: Date): void {
    this._passwordHash = newHash;
    this._updatedAt = now;
    this.record(new UserPasswordChanged(this.id.value, now));
  }

  suspend(now: Date): void {
    if (this._status === UserStatus.SUSPENDED) {
      throw new BusinessRuleViolationError("User is already suspended");
    }
    this._status = UserStatus.SUSPENDED;
    this._updatedAt = now;
    this.record(new UserSuspended(this.id.value, now));
  }

  get email(): Email { return this._email; }
  get username(): Username { return this._username; }
  get passwordHash(): PasswordHash { return this._passwordHash; }
  get role(): UserRole { return this._role; }
  get status(): UserStatus { return this._status; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get isActive(): boolean { return this._status === UserStatus.ACTIVE; }
}
