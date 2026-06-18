import { DomainEvent } from '../../shared/DomainEvent.js';

export class LevelCompletedEvent extends DomainEvent {
  constructor(
    progressId: string,
    readonly levelId: string,
    readonly userId: string,
  ) {
    super(progressId);
  }
}
