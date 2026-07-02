import type { Level } from "../../../domain/level-catalog/Level.js";
import type { LevelStatus } from "../../../domain/level-catalog/enums/LevelStatus.js";
import type { LevelId } from "../../../domain/shared/LevelId.js";

export interface LevelRepository {
  save(level: Level): Promise<void>;
  findById(id: LevelId): Promise<Level | null>;
  findAllPublished(): Promise<Level[]>;
  /** Admin listing: all levels, optionally filtered by status, ordered by createdAt asc. */
  findAll(status?: LevelStatus): Promise<Level[]>;
}
