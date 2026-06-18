// Pattern: Aggregate Root
import { BusinessRuleViolationError } from "../errors/DomainError.js";
import { Entity } from "../shared/Entity.js";
import type { LevelId } from "../shared/LevelId.js";
import type { Difficulty } from "./enums/Difficulty.js";
import { LevelStatus } from "./enums/LevelStatus.js";
import { LevelPublished } from "./events/LevelPublished.js";
import type { LevelSolvabilityPolicy } from "./LevelSolvabilityPolicy.js";
import type { LevelDefinition } from "./value-objects/LevelDefinition.js";
import type { LevelDescription } from "./value-objects/LevelDescription.js";
import type { LevelName } from "./value-objects/LevelName.js";
import type { LevelVersion } from "./value-objects/LevelVersion.js";
import type { MoveCount } from "./value-objects/MoveCount.js";
import type { TimeLimit } from "./value-objects/TimeLimit.js";

export class Level extends Entity<LevelId> {
  private constructor(
    id: LevelId,
    private readonly _name: LevelName,
    private readonly _description: LevelDescription,
    private _definition: LevelDefinition,
    private readonly _difficulty: Difficulty,
    private _status: LevelStatus,
    private readonly _version: LevelVersion,
    private readonly _timeLimit: TimeLimit | undefined,
    private readonly _moveCount: MoveCount | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    super(id);
  }

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
    this.record(
      new LevelPublished(this.id.value, this._name.value, this._difficulty)
    );
  }

  updateDefinition(definition: LevelDefinition): void {
    if (this._status !== LevelStatus.DRAFT) {
      throw new BusinessRuleViolationError(
        "Only draft levels can have their definition updated"
      );
    }
    this._definition = definition;
    this._updatedAt = new Date();
  }

  archive(): void {
    if (this._status !== LevelStatus.PUBLISHED) {
      throw new BusinessRuleViolationError("Only published levels can be archived");
    }
    this._status = LevelStatus.ARCHIVED;
    this._updatedAt = new Date();
  }

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
