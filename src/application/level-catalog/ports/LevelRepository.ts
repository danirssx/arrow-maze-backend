import type { Level } from "../../../domain/level-catalog/Level.js";
import type { LevelId } from "../../../domain/level-catalog/value-objects/LevelId.js";

export interface LevelRepository {
  save(level: Level): Promise<void>;
  findById(id: LevelId): Promise<Level | null>;
  findAllPublished(): Promise<Level[]>;
}
