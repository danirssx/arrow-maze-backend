import { DomainEvent } from "../../shared/DomainEvent.js";

export class UserPasswordChanged extends DomainEvent {
  constructor(public readonly userId: string, occurredOn: Date) {
    super(userId, occurredOn);
  }
}
