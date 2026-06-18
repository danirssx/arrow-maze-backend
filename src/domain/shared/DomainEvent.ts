export abstract class DomainEvent {
  readonly occurredOn: Date;

  constructor(readonly aggregateId: string) {
    this.occurredOn = new Date();
  }
}
