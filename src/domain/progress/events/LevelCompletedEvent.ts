import { DomainEvent } from '../../shared/DomainEvent.js';

export class LevelCompletedEvent extends DomainEvent {
  constructor(
    progressId: string,
    readonly levelId: string,
    readonly userId: string,
    occurredOn: Date,
  ) {
    super(progressId, occurredOn);
  }
}
