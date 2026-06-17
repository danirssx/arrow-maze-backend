import type { DomainEvent } from "../../events/DomainEvent.js";

export class UserPasswordChanged implements DomainEvent {
  readonly occurredAt: Date;

  constructor(public readonly userId: string) {
    this.occurredAt = new Date();
  }
}
