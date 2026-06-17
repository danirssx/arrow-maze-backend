import { DomainEvent } from './DomainEvent.js';

export abstract class Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  constructor(readonly id: TId) {}

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected record(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearEvents(): void {
    this._domainEvents = [];
  }
}
