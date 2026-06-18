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
import { BusinessRuleViolationError } from "../../../src/domain/errors/DomainError";

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
    LevelId.generate(),
    LevelName.create("Test Level"),
    LevelDescription.create("A test level"),
    def,
    Difficulty.EASY,
    LevelVersion.initial()
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
    level.publish(new AlwaysSolvablePolicy());

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
    level.publish(new AlwaysSolvablePolicy());

    // Assert
    expect(level.status).toBe(LevelStatus.PUBLISHED);
    expect(level.isPublished).toBe(true);
  });

  it("should_throw_when_already_published_level_is_published_again", () => {
    // Arrange
    const level = makeDraftLevel();
    level.publish(new AlwaysSolvablePolicy());

    // Act / Assert
    expect(() => level.publish(new AlwaysSolvablePolicy())).toThrow(
      BusinessRuleViolationError
    );
  });

  it("should_throw_when_definition_is_not_solvable", () => {
    // Arrange
    const level = makeDraftLevel();

    // Act / Assert
    expect(() => level.publish(new NeverSolvablePolicy())).toThrow(
      BusinessRuleViolationError
    );
  });

  it("should_pull_domain_events_and_clear_them", () => {
    // Arrange
    const level = makeDraftLevel();
    level.publish(new AlwaysSolvablePolicy());

    // Act
    const first = level.pullDomainEvents();
    const second = level.pullDomainEvents();

    // Assert
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });
});
