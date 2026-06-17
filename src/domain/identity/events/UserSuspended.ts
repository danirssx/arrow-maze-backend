import type { DomainEvent } from "../../events/DomainEvent.js";

export class UserSuspended implements DomainEvent {
  readonly occurredAt: Date;

  constructor(public readonly userId: string) {
    this.occurredAt = new Date();
  }
}
