import { Level } from "../../../../src/domain/level-catalog/Level";
import { LevelSolvabilityPolicy } from "../../../../src/domain/level-catalog/LevelSolvabilityPolicy";
import { CellType } from "../../../../src/domain/level-catalog/enums/CellType";
import { Difficulty } from "../../../../src/domain/level-catalog/enums/Difficulty";
import { Direction } from "../../../../src/domain/level-catalog/enums/Direction";
import { LevelStatus } from "../../../../src/domain/level-catalog/enums/LevelStatus";
import { BoardSize } from "../../../../src/domain/level-catalog/value-objects/BoardSize";
import { CellSpec } from "../../../../src/domain/level-catalog/value-objects/CellSpec";
import { LevelDefinition } from "../../../../src/domain/level-catalog/value-objects/LevelDefinition";
import { LevelDescription } from "../../../../src/domain/level-catalog/value-objects/LevelDescription";
import { LevelId } from "../../../../src/domain/level-catalog/value-objects/LevelId";
import { LevelName } from "../../../../src/domain/level-catalog/value-objects/LevelName";
import { LevelVersion } from "../../../../src/domain/level-catalog/value-objects/LevelVersion";
import { Position } from "../../../../src/domain/level-catalog/value-objects/Position";
import type { LevelRepository } from "../../../../src/application/level-catalog/ports/LevelRepository";

export const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

export function makeSolvableDefinition(): LevelDefinition {
  return LevelDefinition.create(BoardSize.create(3, 3), [
    CellSpec.create(Position.create(0, 0), CellType.START, Direction.RIGHT),
    CellSpec.create(Position.create(0, 1), CellType.ARROW, Direction.DOWN),
    CellSpec.create(Position.create(1, 1), CellType.EXIT),
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

export class FakeLevelRepository implements LevelRepository {
  private store = new Map<string, Level>();
  savedLevels: Level[] = [];

  seed(...levels: Level[]): void {
    for (const l of levels) this.store.set(l.id.getValue(), l);
  }

  async save(level: Level): Promise<void> {
    this.store.set(level.id.getValue(), level);
    this.savedLevels.push(level);
  }

  async findById(id: LevelId): Promise<Level | null> {
    return this.store.get(id.getValue()) ?? null;
  }

  async findAllPublished(): Promise<Level[]> {
    return [...this.store.values()].filter(
      (l) => l.status === LevelStatus.PUBLISHED
    );
  }
}
