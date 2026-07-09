// Pattern: Aggregate Root
import { BusinessRuleViolationError, InvalidArgumentError } from "../errors/DomainError.js";
import { Entity } from "../shared/Entity.js";
import type { LevelId } from "../shared/LevelId.js";
import type { Difficulty } from "./enums/Difficulty.js";
import { LevelStatus } from "./enums/LevelStatus.js";
import { LevelPublished } from "./events/LevelPublished.js";
import type { LevelSolvabilityPolicy } from "./LevelSolvabilityPolicy.js";
import type { BoardShape } from "./value-objects/BoardShape.js";
import type { LevelDefinition } from "./value-objects/LevelDefinition.js";
import type { LevelDescription } from "./value-objects/LevelDescription.js";
import type { LevelName } from "./value-objects/LevelName.js";
import type { LevelVersion } from "./value-objects/LevelVersion.js";
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
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private readonly _boardShape: BoardShape | undefined = undefined
  ) {
    super(id);
    Level.assertArrowsWithinShape(_definition, _boardShape);
  }

  static draft(
    id: LevelId,
    name: LevelName,
    description: LevelDescription,
    definition: LevelDefinition,
    difficulty: Difficulty,
    version: LevelVersion,
    now: Date,
    timeLimit?: TimeLimit,
    boardShape?: BoardShape
  ): Level {
    return new Level(
      id,
      name,
      description,
      definition,
      difficulty,
      LevelStatus.DRAFT,
      version,
      timeLimit,
      now,
      now,
      boardShape
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
    createdAt: Date,
    updatedAt: Date,
    boardShape?: BoardShape
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
      createdAt,
      updatedAt,
      boardShape
    );
  }

  /**
   * Option A invariant: when a board shape is present it is a placement mask, so
   * every cell of every arrow path must lie inside it. The shape is never a
   * physical wall, so extraction/solvability are unaffected.
   */
  private static assertArrowsWithinShape(
    definition: LevelDefinition,
    boardShape: BoardShape | undefined
  ): void {
    if (boardShape === undefined) {
      return;
    }
    const cells = definition.arrows.flatMap((arrow) => [...arrow.path]);
    if (!boardShape.containsAll(cells)) {
      throw new InvalidArgumentError(
        "Level has an arrow cell outside the board shape mask"
      );
    }
  }

  publish(policy: LevelSolvabilityPolicy, now: Date): void {
    if (this._status !== LevelStatus.DRAFT) {
      throw new BusinessRuleViolationError("Only draft levels can be published");
    }
    if (!policy.isSolvable(this._definition)) {
      throw new BusinessRuleViolationError(
        "Level definition contains a circular arrow blocking dependency"
      );
    }
    this._status = LevelStatus.PUBLISHED;
    this._updatedAt = now;
    this.record(
      new LevelPublished(this.id.value, this._name.value, this._difficulty, now)
    );
  }

  updateDefinition(definition: LevelDefinition, now: Date): void {
    if (this._status !== LevelStatus.DRAFT) {
      throw new BusinessRuleViolationError(
        "Only draft levels can have their definition updated"
      );
    }
    this._definition = definition;
    this._updatedAt = now;
  }

  archive(now: Date): void {
    if (this._status !== LevelStatus.PUBLISHED) {
      throw new BusinessRuleViolationError("Only published levels can be archived");
    }
    this._status = LevelStatus.ARCHIVED;
    this._updatedAt = now;
  }

  get name(): LevelName { return this._name; }
  get description(): LevelDescription { return this._description; }
  get definition(): LevelDefinition { return this._definition; }
  get difficulty(): Difficulty { return this._difficulty; }
  get status(): LevelStatus { return this._status; }
  get version(): LevelVersion { return this._version; }
  get timeLimit(): TimeLimit | undefined { return this._timeLimit; }
  get boardShape(): BoardShape | undefined { return this._boardShape; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get isDraft(): boolean { return this._status === LevelStatus.DRAFT; }
  get isPublished(): boolean { return this._status === LevelStatus.PUBLISHED; }
}
