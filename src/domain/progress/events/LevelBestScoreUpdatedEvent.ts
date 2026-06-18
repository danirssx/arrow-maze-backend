import { DomainEvent } from '../../shared/DomainEvent.js';

export class LevelBestScoreUpdatedEvent extends DomainEvent {
  constructor(
    progressId: string,
    readonly levelId: string,
    readonly userId: string,
  ) {
    super(progressId);
  }
}
