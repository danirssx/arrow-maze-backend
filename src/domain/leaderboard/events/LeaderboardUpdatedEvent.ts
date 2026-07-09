import { DomainEvent } from '../../shared/DomainEvent.js';

export class LeaderboardUpdatedEvent extends DomainEvent {
  constructor(
    leaderboardId: string,
    readonly entryId: string,
    readonly userId: string,
    occurredOn: Date,
  ) {
    super(leaderboardId, occurredOn);
  }
}
