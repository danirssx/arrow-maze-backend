// Pattern: Aggregate Root
import { DomainError } from "../errors/DomainError.js";
import type { DomainEvent } from "../events/DomainEvent.js";
import { UserRole } from "./enums/UserRole.js";
import { UserStatus } from "./enums/UserStatus.js";
import { UserPasswordChanged } from "./events/UserPasswordChanged.js";
import { UserRegistered } from "./events/UserRegistered.js";
import { UserSuspended } from "./events/UserSuspended.js";
import type { Email } from "./value-objects/Email.js";
import type { PasswordHash } from "./value-objects/PasswordHash.js";
import type { UserId } from "./value-objects/UserId.js";
import type { Username } from "./value-objects/Username.js";

export class User {
  private readonly _domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: UserId,
    private readonly _email: Email,
    private readonly _username: Username,
    private _passwordHash: PasswordHash,
    private readonly _role: UserRole,
    private _status: UserStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static register(
    id: UserId,
    email: Email,
    username: Username,
    passwordHash: PasswordHash,
    role: UserRole = UserRole.USER
  ): User {
    const now = new Date();
    const user = new User(id, email, username, passwordHash, role, UserStatus.ACTIVE, now, now);
    user._domainEvents.push(
      new UserRegistered(id.getValue(), email.getValue(), username.getValue(), role)
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

  changePassword(newHash: PasswordHash): void {
    this._passwordHash = newHash;
    this._updatedAt = new Date();
    this._domainEvents.push(new UserPasswordChanged(this._id.getValue()));
  }

  suspend(): void {
    if (this._status === UserStatus.SUSPENDED) {
      throw new DomainError("User is already suspended", "USER_ALREADY_SUSPENDED");
    }
    this._status = UserStatus.SUSPENDED;
    this._updatedAt = new Date();
    this._domainEvents.push(new UserSuspended(this._id.getValue()));
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }

  get id(): UserId { return this._id; }
  get email(): Email { return this._email; }
  get username(): Username { return this._username; }
  get passwordHash(): PasswordHash { return this._passwordHash; }
  get role(): UserRole { return this._role; }
  get status(): UserStatus { return this._status; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get isActive(): boolean { return this._status === UserStatus.ACTIVE; }
}
