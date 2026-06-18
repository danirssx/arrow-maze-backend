import type { LevelCompletedEvent } from '../../../domain/progress/events/LevelCompletedEvent.js';

export class OnLevelCompletedHandler {
  async handle(_event: LevelCompletedEvent): Promise<void> {
    // Team: add level-unlock, notification, or cross-context logic here.
  }
}
