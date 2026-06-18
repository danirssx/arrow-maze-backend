import type { DomainEvent } from '../../../domain/shared/DomainEvent.js';

export interface IDomainEventBus {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}
