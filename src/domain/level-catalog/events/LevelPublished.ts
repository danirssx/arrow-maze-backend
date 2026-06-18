import type { DomainEvent } from "../../events/DomainEvent.js";
import type { Difficulty } from "../enums/Difficulty.js";

export class LevelPublished implements DomainEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly levelId: string,
    public readonly name: string,
    public readonly difficulty: Difficulty
  ) {
    this.occurredAt = new Date();
  }
}
