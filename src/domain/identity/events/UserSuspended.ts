import { DomainEvent } from "../../shared/DomainEvent.js";

export class UserSuspended extends DomainEvent {
  constructor(public readonly userId: string, occurredOn: Date) {
    super(userId, occurredOn);
  }
}
