/**
 * Loader for the canonical level catalog stored as JSON under `level-json/`.
 *
 * These JSON files are the SINGLE source of truth for the published catalog: drop a
 * new `<order>-<slug>.json` here, run `npm run db:seed`, and it appears in the game.
 * Each file is validated through the SAME domain path as the application before it can
 * be seeded: `recordToLevel` reconstitutes the aggregate (validating ArrowSpec
 * invariants and, for shaped levels (Option A), the board-shape mask + arrow
 * containment), and `LevelSolvabilityPolicy` proves the arrow blocking graph is an
 * acyclic DAG. The loader also enforces a unique `id` and `order` across the catalog
 * and returns the levels sorted by `order` (which drives the level number in the UI).
 * Any invalid/unsolvable/duplicate file throws, so the seed can never publish a broken
 * or colliding level. The client consumes this catalog through the backend API; there
 * is no second canonical catalog.
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
  order: number;
  attempts: number;
  timeLimitSeconds?: number | null;
  arrows: { id: string; color: string; path: { row: number; col: number }[]; direction: string }[];
  boardShape?: { type: string; cells: { row: number; col: number }[] } | null;
};

/** A seed-ready level record (the shape `prisma/seed.ts` upserts), sorted by `order`. */
export type AuthoredLevelRecord = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  status: "PUBLISHED";
  version: number;
  order: number;
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

  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();

  const levels = files.map((file): AuthoredLevelRecord => {
    const json = JSON.parse(readFileSync(join(dir, file), "utf8")) as AuthoredLevelJson;

    if (!Number.isInteger(json.order)) {
      throw new Error(`Authored level ${json.id} (${file}) must have an integer "order"`);
    }
    if (seenIds.has(json.id)) {
      throw new Error(`Duplicate authored level id ${json.id} (${file})`);
    }
    if (seenOrders.has(json.order)) {
      throw new Error(`Duplicate authored level order ${json.order} (${file})`);
    }
    seenIds.add(json.id);
    seenOrders.add(json.order);

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
      order: json.order,
      arrows: json.arrows,
      attempts: json.attempts,
      timeLimitSeconds: json.timeLimitSeconds ?? null,
      boardShape: json.boardShape ?? null,
    };
  });

  return levels.sort((a, b) => a.order - b.order);
}
