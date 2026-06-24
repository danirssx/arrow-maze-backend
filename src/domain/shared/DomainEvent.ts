export abstract class DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly occurredOn: Date,
  ) {}
}
