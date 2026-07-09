import { Level } from "../../../src/domain/level-catalog/Level";
import { LevelSolvabilityPolicy } from "../../../src/domain/level-catalog/LevelSolvabilityPolicy";
import { LevelDefinition } from "../../../src/domain/level-catalog/value-objects/LevelDefinition";
import { Position } from "../../../src/domain/level-catalog/value-objects/Position";
import { ArrowSpec } from "../../../src/domain/level-catalog/value-objects/ArrowSpec";
import { LevelId } from "../../../src/domain/shared/LevelId.js";
import { LevelName } from "../../../src/domain/level-catalog/value-objects/LevelName";
import { LevelDescription } from "../../../src/domain/level-catalog/value-objects/LevelDescription";
import { LevelVersion } from "../../../src/domain/level-catalog/value-objects/LevelVersion";
import { Direction } from "../../../src/domain/level-catalog/enums/Direction";
import { Difficulty } from "../../../src/domain/level-catalog/enums/Difficulty";
import { LevelStatus } from "../../../src/domain/level-catalog/enums/LevelStatus";
import { LevelPublished } from "../../../src/domain/level-catalog/events/LevelPublished";
import {
  BusinessRuleViolationError,
  InvalidArgumentError,
} from "../../../src/domain/errors/DomainError";
import { BoardShape } from "../../../src/domain/level-catalog/value-objects/BoardShape";

const FIXED_LEVEL_ID = "22222222-2222-4222-a222-222222222222";
const FIXED_LEVEL_NOW = new Date("2024-01-15T10:00:00.000Z");

// Subject to human review — domain aggregate test

class AlwaysSolvablePolicy extends LevelSolvabilityPolicy {
  override isSolvable(_def: LevelDefinition): boolean {
    return true;
  }
}

class NeverSolvablePolicy extends LevelSolvabilityPolicy {
  override isSolvable(_def: LevelDefinition): boolean {
    return false;
  }
}

const makeSolvableDefinition = () =>
  LevelDefinition.create([
    ArrowSpec.create("a", "#5262FB", [Position.create(0, 0)], Direction.UP),
  ]);

const makeDraftLevel = (def = makeSolvableDefinition()) =>
  Level.draft(
    LevelId.create(FIXED_LEVEL_ID),
    LevelName.create("Test Level"),
    LevelDescription.create("A test level"),
    def,
    Difficulty.EASY,
    LevelVersion.initial(),
    FIXED_LEVEL_NOW,
  );

describe("Level", () => {
  it("should_be_in_draft_status_when_created", () => {
    const level = makeDraftLevel();
    expect(level.status).toBe(LevelStatus.DRAFT);
    expect(level.isDraft).toBe(true);
  });

  it("should_emit_level_published_event_when_draft_level_is_published", () => {
    // Arrange
    const level = makeDraftLevel();

    // Act
    level.publish(new AlwaysSolvablePolicy(), FIXED_LEVEL_NOW);

    // Assert
    const events = level.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(LevelPublished);
    const event = events[0] as LevelPublished;
    expect(event.name).toBe("Test Level");
    expect(event.difficulty).toBe(Difficulty.EASY);
  });

  it("should_change_status_to_published_when_publish_succeeds", () => {
    // Arrange
    const level = makeDraftLevel();

    // Act
    level.publish(new AlwaysSolvablePolicy(), FIXED_LEVEL_NOW);

    // Assert
    expect(level.status).toBe(LevelStatus.PUBLISHED);
    expect(level.isPublished).toBe(true);
  });

  it("should_throw_when_already_published_level_is_published_again", () => {
    // Arrange
    const level = makeDraftLevel();
    level.publish(new AlwaysSolvablePolicy(), FIXED_LEVEL_NOW);

    // Act / Assert
    expect(() => level.publish(new AlwaysSolvablePolicy(), FIXED_LEVEL_NOW)).toThrow(
      BusinessRuleViolationError
    );
  });

  it("should_throw_when_definition_is_not_solvable", () => {
    // Arrange
    const level = makeDraftLevel();

    // Act / Assert
    expect(() => level.publish(new NeverSolvablePolicy(), FIXED_LEVEL_NOW)).toThrow(
      BusinessRuleViolationError
    );
  });

  it("should_pull_domain_events_and_clear_them", () => {
    // Arrange
    const level = makeDraftLevel();
    level.publish(new AlwaysSolvablePolicy(), FIXED_LEVEL_NOW);

    // Act
    const first = level.pullDomainEvents();
    const second = level.pullDomainEvents();

    // Assert
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });
});

describe("Level board shape (Option A)", () => {
  const shapedDefinition = () =>
    LevelDefinition.create([
      ArrowSpec.create(
        "a",
        "#5262FB",
        [Position.create(0, 0), Position.create(0, 1)],
        Direction.RIGHT
      ),
    ]);

  const draftWithShape = (shape: BoardShape) =>
    Level.draft(
      LevelId.create(FIXED_LEVEL_ID),
      LevelName.create("Shaped"),
      LevelDescription.create("A shaped level"),
      shapedDefinition(),
      Difficulty.EASY,
      LevelVersion.initial(),
      FIXED_LEVEL_NOW,
      undefined,
      shape
    );

  it("should_expose_a_board_shape_that_contains_all_arrow_cells", () => {
    // Arrange
    const shape = BoardShape.cellMask([
      Position.create(0, 0),
      Position.create(0, 1),
      Position.create(1, 0),
    ]);

    // Act
    const level = draftWithShape(shape);

    // Assert
    expect(level.boardShape).toBe(shape);
  });

  it("should_default_board_shape_to_undefined_when_not_provided", () => {
    expect(makeDraftLevel().boardShape).toBeUndefined();
  });

  it("should_throw_when_an_arrow_cell_lies_outside_the_board_shape", () => {
    // Arrange — mask omits (0, 1) which arrow "a" occupies
    const shape = BoardShape.cellMask([Position.create(0, 0)]);

    // Act / Assert
    expect(() => draftWithShape(shape)).toThrow(InvalidArgumentError);
  });

  it("should_throw_when_reconstituting_with_an_arrow_outside_the_shape", () => {
    // Arrange
    const shape = BoardShape.cellMask([Position.create(0, 0)]);

    // Act / Assert
    expect(() =>
      Level.reconstitute(
        LevelId.create(FIXED_LEVEL_ID),
        LevelName.create("Shaped"),
        LevelDescription.create("A shaped level"),
        shapedDefinition(),
        Difficulty.EASY,
        LevelStatus.PUBLISHED,
        LevelVersion.initial(),
        undefined,
        new Date(),
        new Date(),
        shape
      )
    ).toThrow(InvalidArgumentError);
  });

  it("should_throw_when_updating_definition_with_an_arrow_outside_the_shape", () => {
    // Arrange
    const shape = BoardShape.cellMask([
      Position.create(0, 0),
      Position.create(0, 1),
      Position.create(1, 0),
    ]);
    const level = draftWithShape(shape);
    const outsideDefinition = LevelDefinition.create([
      ArrowSpec.create("b", "#5262FB", [Position.create(2, 2)], Direction.UP),
    ]);

    // Act / Assert
    expect(() => level.updateDefinition(outsideDefinition, new Date())).toThrow(InvalidArgumentError);
  });
});

// @s4 — injected clock
describe("Level injected clock", () => {
  const draftWithClock = (now = FIXED_LEVEL_NOW) =>
    Level.draft(
      LevelId.create(FIXED_LEVEL_ID),
      LevelName.create("Test Level"),
      LevelDescription.create("A test level"),
      makeSolvableDefinition(),
      Difficulty.EASY,
      LevelVersion.initial(),
      now,
    );

  it("should_set_createdAt_and_updatedAt_to_injected_now_when_drafted", () => {
    const level = draftWithClock();
    expect(level.createdAt).toBe(FIXED_LEVEL_NOW);
    expect(level.updatedAt).toBe(FIXED_LEVEL_NOW);
  });

  it("should_set_updatedAt_to_injected_now_when_published", () => {
    const publishNow = new Date("2024-01-16T10:00:00.000Z");
    const level = draftWithClock();
    level.publish(new AlwaysSolvablePolicy(), publishNow);
    expect(level.updatedAt).toBe(publishNow);
  });

  it("should_set_updatedAt_to_injected_now_when_definition_updated", () => {
    const updateNow = new Date("2024-01-17T10:00:00.000Z");
    const level = draftWithClock();
    level.updateDefinition(makeSolvableDefinition(), updateNow);
    expect(level.updatedAt).toBe(updateNow);
  });

  it("should_set_updatedAt_to_injected_now_when_archived", () => {
    const archiveNow = new Date("2024-01-18T10:00:00.000Z");
    const level = draftWithClock();
    level.publish(new AlwaysSolvablePolicy(), new Date("2024-01-16T10:00:00.000Z"));
    level.archive(archiveNow);
    expect(level.updatedAt).toBe(archiveNow);
  });
});
