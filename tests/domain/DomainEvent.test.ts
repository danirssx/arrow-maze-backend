import { DomainEvent } from '../../src/domain/shared/DomainEvent.js';

class TestEvent extends DomainEvent {
  constructor(aggregateId: string, occurredOn: Date) {
    super(aggregateId, occurredOn);
  }
}

describe('DomainEvent', () => {
  it('should_store_injected_occurredOn_when_event_is_created', () => {
    // Arrange
    const fixedDate = new Date('2024-01-15T10:00:00.000Z');

    // Act
    const event = new TestEvent('agg-1', fixedDate);

    // Assert
    expect(event.occurredOn).toBe(fixedDate);
    expect(event.aggregateId).toBe('agg-1');
  });

  it('should_not_call_new_Date_internally_when_occurredOn_is_injected', () => {
    // Arrange
    const past = new Date('2000-01-01T00:00:00.000Z');

    // Act
    const event = new TestEvent('agg-2', past);

    // Assert
    expect(event.occurredOn.getUTCFullYear()).toBe(2000);
  });
});
