import type { DomainEvent } from '../../domain/shared/DomainEvent.js';

export interface DomainEventBus {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}
