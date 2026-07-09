import { DomainEvent } from "../../shared/DomainEvent.js";
import type { UserRole } from "../enums/UserRole.js";

export class UserRegistered extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
    public readonly role: UserRole,
    occurredOn: Date,
  ) {
    super(userId, occurredOn);
  }
}
