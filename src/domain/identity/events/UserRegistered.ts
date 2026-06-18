import type { DomainEvent } from "../../events/DomainEvent.js";
import type { UserRole } from "../enums/UserRole.js";

export class UserRegistered implements DomainEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
    public readonly role: UserRole
  ) {
    this.occurredAt = new Date();
  }
}
