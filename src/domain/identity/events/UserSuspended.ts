import { DomainEvent } from "../../shared/DomainEvent.js";

export class UserSuspended extends DomainEvent {
  constructor(public readonly userId: string) {
    super(userId);
  }
}
