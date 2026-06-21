/**
 * Loader for canonical authored levels stored as JSON under `level-json/`.
 *
 * Each file is the source of truth for one published level (Option A: it may carry
 * an optional `boardShape` CELL_MASK). The loader validates every file through the
 * SAME domain path as the application before it can be seeded: `recordToLevel`
 * reconstitutes the aggregate (validating ArrowSpec invariants, the board-shape
 * mask, and arrow-containment), and `LevelSolvabilityPolicy` proves the arrow
 * blocking graph is an acyclic DAG. An invalid or unsolvable file throws, so the
 * seed can never publish a broken level. The client keeps the backend as the single
 * source of truth — there is no second canonical catalog.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LevelSolvabilityPolicy } from "../../src/domain/level-catalog/LevelSolvabilityPolicy.js";
import type { LevelRecord } from "../../src/infrastructure/level-catalog/LevelMapper.js";
import { recordToLevel } from "../../src/infrastructure/level-catalog/LevelMapper.js";

/** Authoring JSON shape (status/version are supplied by the loader). */
type AuthoredLevelJson = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  attempts: number;
  timeLimitSeconds?: number | null;
  arrows: { id: string; color: string; path: { row: number; col: number }[]; direction: string }[];
  boardShape?: { type: string; cells: { row: number; col: number }[] } | null;
};

/** A seed-ready level record (the shape `prisma/seed.ts` upserts). */
export type AuthoredLevelRecord = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  status: "PUBLISHED";
  version: number;
  arrows: AuthoredLevelJson["arrows"];
  attempts: number;
  timeLimitSeconds: number | null;
  boardShape: AuthoredLevelJson["boardShape"] | null;
};

const DEFAULT_DIR = join(process.cwd(), "prisma", "seed-data", "level-json");

export function loadAuthoredLevels(dir: string = DEFAULT_DIR): AuthoredLevelRecord[] {
  const policy = new LevelSolvabilityPolicy();
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  return files.map((file) => {
    const json = JSON.parse(readFileSync(join(dir, file), "utf8")) as AuthoredLevelJson;
    const now = new Date();
    const record: LevelRecord = {
      id: json.id,
      name: json.name,
      description: json.description,
      difficulty: json.difficulty,
      status: "PUBLISHED",
      version: 1,
      arrows: json.arrows,
      attempts: json.attempts,
      timeLimitSeconds: json.timeLimitSeconds ?? null,
      boardShape: json.boardShape ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Validate through the domain: VO invariants, board-shape mask + arrow containment.
    const level = recordToLevel(record);
    // Validate the puzzle is winnable: the blocking graph must be an acyclic DAG.
    if (!policy.isSolvable(level.definition)) {
      throw new Error(`Authored level ${json.id} (${file}) is not solvable`);
    }

    return {
      id: json.id,
      name: json.name,
      description: json.description,
      difficulty: json.difficulty,
      status: "PUBLISHED",
      version: 1,
      arrows: json.arrows,
      attempts: json.attempts,
      timeLimitSeconds: json.timeLimitSeconds ?? null,
      boardShape: json.boardShape ?? null,
    };
  });
}
