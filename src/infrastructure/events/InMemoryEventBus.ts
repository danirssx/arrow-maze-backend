import type { DomainEventBus } from '../../application/ports/DomainEventBus.js';
import type { DomainEvent } from '../../domain/shared/DomainEvent.js';
import type { Logger } from '../../application/ports/Logger.js';

export class InMemoryEventBus implements DomainEventBus {
  constructor(private readonly logger: Logger) {}

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      this.logger.info(`[DomainEvent] ${event.constructor.name}`, { event });
    }
  }
}
