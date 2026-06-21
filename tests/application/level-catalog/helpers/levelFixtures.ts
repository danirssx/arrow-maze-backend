import { Level } from "../../../../src/domain/level-catalog/Level";
import { LevelSolvabilityPolicy } from "../../../../src/domain/level-catalog/LevelSolvabilityPolicy";
import { Difficulty } from "../../../../src/domain/level-catalog/enums/Difficulty";
import { Direction } from "../../../../src/domain/level-catalog/enums/Direction";
import { LevelStatus } from "../../../../src/domain/level-catalog/enums/LevelStatus";
import { ArrowSpec } from "../../../../src/domain/level-catalog/value-objects/ArrowSpec";
import { BoardShape } from "../../../../src/domain/level-catalog/value-objects/BoardShape";
import { LevelDefinition } from "../../../../src/domain/level-catalog/value-objects/LevelDefinition";
import { LevelDescription } from "../../../../src/domain/level-catalog/value-objects/LevelDescription";
import { LevelId } from "../../../../src/domain/shared/LevelId.js";
import { LevelName } from "../../../../src/domain/level-catalog/value-objects/LevelName";
import { LevelVersion } from "../../../../src/domain/level-catalog/value-objects/LevelVersion";
import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";
import type { LevelRepository } from "../../../../src/application/level-catalog/ports/LevelRepository";

export const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

export function makeSolvableDefinition(): LevelDefinition {
  return LevelDefinition.create([
    ArrowSpec.create("a", "#5262FB", [Position.create(0, 0)], Direction.UP),
  ]);
}

export function makeDraftLevel(id = VALID_UUID): Level {
  return Level.draft(
    LevelId.create(id),
    LevelName.create("Test Level"),
    LevelDescription.create("A test level"),
    makeSolvableDefinition(),
    Difficulty.EASY,
    LevelVersion.initial()
  );
}

export function makePublishedLevel(id = VALID_UUID): Level {
  const level = makeDraftLevel(id);
  level.publish(new LevelSolvabilityPolicy());
  level.pullDomainEvents();
  return level;
}

export function makeArchivedLevel(id = VALID_UUID): Level {
  const level = makePublishedLevel(id);
  level.archive();
  return level;
}

/** A 2x2 CELL_MASK that contains the single 2-cell arrow used in shaped fixtures. */
export function makeBoardShape(): BoardShape {
  return BoardShape.cellMask([
    Position.create(0, 0),
    Position.create(0, 1),
    Position.create(1, 0),
    Position.create(1, 1),
  ]);
}

export function makeShapedDraftLevel(id = VALID_UUID): Level {
  const definition = LevelDefinition.create([
    ArrowSpec.create(
      "a",
      "#5262FB",
      [Position.create(0, 0), Position.create(0, 1)],
      Direction.RIGHT
    ),
  ]);
  return Level.draft(
    LevelId.create(id),
    LevelName.create("Shaped Level"),
    LevelDescription.create("A shaped level"),
    definition,
    Difficulty.EASY,
    LevelVersion.initial(),
    undefined,
    makeBoardShape()
  );
}

export function makeShapedPublishedLevel(id = VALID_UUID): Level {
  const level = makeShapedDraftLevel(id);
  level.publish(new LevelSolvabilityPolicy());
  level.pullDomainEvents();
  return level;
}

export class FakeLevelRepository implements LevelRepository {
  private store = new Map<string, Level>();
  savedLevels: Level[] = [];

  seed(...levels: Level[]): void {
    for (const l of levels) this.store.set(l.id.value, l);
  }

  async save(level: Level): Promise<void> {
    this.store.set(level.id.value, level);
    this.savedLevels.push(level);
  }

  async findById(id: LevelId): Promise<Level | null> {
    return this.store.get(id.value) ?? null;
  }

  async findAllPublished(): Promise<Level[]> {
    return [...this.store.values()].filter(
      (l) => l.status === LevelStatus.PUBLISHED
    );
  }
}
