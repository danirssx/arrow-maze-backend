// Pattern: Aggregate Root
import { BusinessRuleViolationError } from "../errors/DomainError.js";
import type { DomainEvent } from "../events/DomainEvent.js";
import type { Difficulty } from "./enums/Difficulty.js";
import { LevelStatus } from "./enums/LevelStatus.js";
import { LevelPublished } from "./events/LevelPublished.js";
import type { LevelSolvabilityPolicy } from "./LevelSolvabilityPolicy.js";
import type { LevelDefinition } from "./value-objects/LevelDefinition.js";
import type { LevelDescription } from "./value-objects/LevelDescription.js";
import type { LevelId } from "./value-objects/LevelId.js";
import type { LevelName } from "./value-objects/LevelName.js";
import type { LevelVersion } from "./value-objects/LevelVersion.js";
import type { MoveCount } from "./value-objects/MoveCount.js";
import type { TimeLimit } from "./value-objects/TimeLimit.js";

export class Level {
  private readonly _domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: LevelId,
    private readonly _name: LevelName,
    private readonly _description: LevelDescription,
    private readonly _definition: LevelDefinition,
    private readonly _difficulty: Difficulty,
    private _status: LevelStatus,
    private readonly _version: LevelVersion,
    private readonly _timeLimit: TimeLimit | undefined,
    private readonly _moveCount: MoveCount | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static draft(
    id: LevelId,
    name: LevelName,
    description: LevelDescription,
    definition: LevelDefinition,
    difficulty: Difficulty,
    version: LevelVersion,
    timeLimit?: TimeLimit,
    moveCount?: MoveCount
  ): Level {
    const now = new Date();
    return new Level(
      id,
      name,
      description,
      definition,
      difficulty,
      LevelStatus.DRAFT,
      version,
      timeLimit,
      moveCount,
      now,
      now
    );
  }

  static reconstitute(
    id: LevelId,
    name: LevelName,
    description: LevelDescription,
    definition: LevelDefinition,
    difficulty: Difficulty,
    status: LevelStatus,
    version: LevelVersion,
    timeLimit: TimeLimit | undefined,
    moveCount: MoveCount | undefined,
    createdAt: Date,
    updatedAt: Date
  ): Level {
    return new Level(
      id,
      name,
      description,
      definition,
      difficulty,
      status,
      version,
      timeLimit,
      moveCount,
      createdAt,
      updatedAt
    );
  }

  publish(policy: LevelSolvabilityPolicy): void {
    if (this._status !== LevelStatus.DRAFT) {
      throw new BusinessRuleViolationError("Only draft levels can be published");
    }
    if (!policy.isSolvable(this._definition)) {
      throw new BusinessRuleViolationError(
        "Level has no valid path from start to exit"
      );
    }
    this._status = LevelStatus.PUBLISHED;
    this._updatedAt = new Date();
    this._domainEvents.push(
      new LevelPublished(this._id.getValue(), this._name.getValue(), this._difficulty)
    );
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }

  get id(): LevelId { return this._id; }
  get name(): LevelName { return this._name; }
  get description(): LevelDescription { return this._description; }
  get definition(): LevelDefinition { return this._definition; }
  get difficulty(): Difficulty { return this._difficulty; }
  get status(): LevelStatus { return this._status; }
  get version(): LevelVersion { return this._version; }
  get timeLimit(): TimeLimit | undefined { return this._timeLimit; }
  get moveCount(): MoveCount | undefined { return this._moveCount; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get isDraft(): boolean { return this._status === LevelStatus.DRAFT; }
  get isPublished(): boolean { return this._status === LevelStatus.PUBLISHED; }
}
