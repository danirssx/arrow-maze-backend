import { DomainEvent } from "../../shared/DomainEvent.js";
import type { Difficulty } from "../enums/Difficulty.js";

export class LevelPublished extends DomainEvent {
  constructor(
    public readonly levelId: string,
    public readonly name: string,
    public readonly difficulty: Difficulty,
    occurredOn: Date,
  ) {
    super(levelId, occurredOn);
  }
}
