/**
 * Generates src/infrastructure/database/seeds/001_seed_levels.sql.
 *
 * The 15 published levels are "knots" of bendable snake-arrows (Arrow Untangle
 * model). Each arrow's body bends in L / zigzag / staircase shapes using only
 * DOWN/LEFT steps away from a head that points UP or RIGHT. Under those two rules
 * the blocking graph is always acyclic, so every generated level is provably
 * solvable. This script does not assume that: it validates every arrow against the
 * real domain `ArrowSpec` invariants and asserts `LevelSolvabilityPolicy` reports
 * a DAG before writing the seed. Run with: `npx tsx scripts/generate-level-seed.ts`.
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { Direction } from "../src/domain/level-catalog/enums/Direction.js";
import { Difficulty } from "../src/domain/level-catalog/enums/Difficulty.js";
import { ArrowSpec } from "../src/domain/level-catalog/value-objects/ArrowSpec.js";
import { LevelDefinition } from "../src/domain/level-catalog/value-objects/LevelDefinition.js";
import { Position } from "../src/domain/level-catalog/value-objects/Position.js";
import { LevelSolvabilityPolicy } from "../src/domain/level-catalog/LevelSolvabilityPolicy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

type Axis = "UP" | "RIGHT";
type BodyStep = "DOWN" | "LEFT";

type ArrowDraft = {
  id: string;
  color: string;
  headRow: number;
  headCol: number;
  axis: Axis;
  body: BodyStep[];
};

type ArrowRecord = {
  id: string;
  color: string;
  path: { row: number; col: number }[];
  direction: string;
};

type LevelMeta = {
  name: string;
  description: string;
  difficulty: Difficulty;
  arrowCount: number;
  attempts: number;
  timeLimitSeconds?: number;
};

const COLORS = ["blue", "green", "yellow", "pink", "cyan", "purple", "crimson", "white", "orange", "teal"];

function color(index: number): string {
  return COLORS[index % COLORS.length] ?? "blue";
}

function letter(index: number): string {
  return String.fromCharCode(97 + index);
}

function run(length: number, step: BodyStep): BodyStep[] {
  return Array.from({ length: Math.max(0, length) }, () => step);
}

function lShape(length: number, first: BodyStep): BodyStep[] {
  const second: BodyStep = first === "DOWN" ? "LEFT" : "DOWN";
  const head = Math.ceil(length / 2);
  return [...run(head, first), ...run(length - head, second)];
}

function zigzag(length: number, first: BodyStep): BodyStep[] {
  const second: BodyStep = first === "DOWN" ? "LEFT" : "DOWN";
  return Array.from({ length: Math.max(0, length) }, (_, i) => (i % 2 === 0 ? first : second));
}

/** Snake-knot generator: head bar on row 0 + UP/RIGHT snakes that bend DOWN/LEFT. */
function knot(n: number): ArrowDraft[] {
  const width = Math.max(4, Math.ceil(n / 2) + 2);
  const arrows: ArrowDraft[] = [
    { id: letter(0), color: color(0), headRow: 0, headCol: width, axis: "RIGHT", body: run(width, "LEFT") }
  ];

  for (let i = 1; i < n; i += 1) {
    const bodyLength = 2 + (i % 3);
    if (i % 2 === 1) {
      arrows.push({
        id: letter(i),
        color: color(i),
        headRow: 1,
        headCol: (i * 2) % width,
        axis: "UP",
        body: (i % 3 === 0 ? zigzag : lShape)(bodyLength, "DOWN")
      });
    } else {
      arrows.push({
        id: letter(i),
        color: color(i),
        headRow: 1 + (i % 4),
        headCol: width + 1 + (i % 3),
        axis: "RIGHT",
        body: (i % 3 === 0 ? zigzag : lShape)(bodyLength, "LEFT")
      });
    }
  }

  return arrows;
}

function buildPath(draft: ArrowDraft): Position[] {
  let row = draft.headRow;
  let col = draft.headCol;
  const fromHead = [Position.create(row, col)];
  for (const step of draft.body) {
    if (step === "DOWN") row += 1;
    else col -= 1;
    fromHead.push(Position.create(row, col));
  }
  return fromHead.reverse(); // tail -> head
}

function toArrowRecord(draft: ArrowDraft): ArrowRecord {
  const direction = draft.axis === "UP" ? Direction.UP : Direction.RIGHT;
  const path = buildPath(draft);
  // Validate through the real domain so a bad seed fails loudly here, not at load.
  ArrowSpec.create(draft.id, draft.color, path, direction);
  return {
    id: draft.id,
    color: draft.color,
    path: path.map((p) => ({ row: p.row, col: p.col })),
    direction
  };
}

const LEVELS: LevelMeta[] = [
  { name: "First Knot", description: "Your first untangle. Tap arrows so each flies off a clear path.", difficulty: Difficulty.EASY, arrowCount: 2, attempts: 5 },
  { name: "Warm-Up", description: "Three arrows, one right order. Clear the board.", difficulty: Difficulty.EASY, arrowCount: 3, attempts: 5 },
  { name: "Cross", description: "Bodies start to bend and cross. Free the blocked ones.", difficulty: Difficulty.EASY, arrowCount: 3, attempts: 5 },
  { name: "Tangle", description: "Four snakes weave together. Find what's free now.", difficulty: Difficulty.EASY, arrowCount: 4, attempts: 5 },
  { name: "Weave", description: "Look before you tap: pick the order that unwinds the knot.", difficulty: Difficulty.EASY, arrowCount: 4, attempts: 5 },
  { name: "Stack", description: "Five arrows stacked into a tighter knot.", difficulty: Difficulty.MEDIUM, arrowCount: 5, attempts: 5 },
  { name: "Rush", description: "Same idea, against the clock. Be quick and clean.", difficulty: Difficulty.MEDIUM, arrowCount: 5, attempts: 5, timeLimitSeconds: 75 },
  { name: "Lattice", description: "Six snakes overlap into a lattice. Read the rays.", difficulty: Difficulty.MEDIUM, arrowCount: 6, attempts: 5 },
  { name: "Pressure", description: "Six arrows, a timer, and longer bodies.", difficulty: Difficulty.MEDIUM, arrowCount: 6, attempts: 5, timeLimitSeconds: 70 },
  { name: "Medium Finale", description: "Seven arrows close out the medium tier.", difficulty: Difficulty.MEDIUM, arrowCount: 7, attempts: 5, timeLimitSeconds: 65 },
  { name: "Hard Knot", description: "Hard tier: fewer attempts, denser crossings.", difficulty: Difficulty.HARD, arrowCount: 7, attempts: 4 },
  { name: "Hard Timer", description: "Eight snakes against the clock.", difficulty: Difficulty.HARD, arrowCount: 8, attempts: 4, timeLimitSeconds: 70 },
  { name: "Hard Mesh", description: "A mesh of eight long, bending bodies.", difficulty: Difficulty.HARD, arrowCount: 8, attempts: 4, timeLimitSeconds: 65 },
  { name: "Hard Snarl", description: "Nine arrows snarled tight. Stay calm, read the order.", difficulty: Difficulty.HARD, arrowCount: 9, attempts: 4, timeLimitSeconds: 60 },
  { name: "Hard Finale", description: "Ten snakes, three attempts, one clean solution.", difficulty: Difficulty.HARD, arrowCount: 10, attempts: 3, timeLimitSeconds: 55 }
];

function levelId(index: number): string {
  // Reuse the first three ids referenced by 002_seed_demo_data; extend sequentially.
  return `550e8400-e29b-41d4-a716-4466554400${String(10 + index).padStart(2, "0")}`;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJsonb(records: ArrowRecord[]): string {
  return `${sqlString(JSON.stringify(records))}::jsonb`;
}

function sqlNumberOrNull(value: number | undefined): string {
  return value === undefined ? "NULL" : String(value);
}

const policy = new LevelSolvabilityPolicy();
const rows: string[] = [];

LEVELS.forEach((meta, index) => {
  const drafts = knot(meta.arrowCount);
  const records = drafts.map(toArrowRecord);

  // Hard guarantee: the level must be a DAG (solvable) before it is seeded.
  const definition = LevelDefinition.create(
    records.map((r) =>
      ArrowSpec.create(
        r.id,
        r.color,
        r.path.map((p) => Position.create(p.row, p.col)),
        r.direction as Direction
      )
    ),
    meta.attempts
  );
  if (!policy.isSolvable(definition)) {
    throw new Error(`Level "${meta.name}" is not solvable (blocking graph has a cycle)`);
  }

  const id = levelId(index);
  rows.push(
    `-- Level ${index + 1}: ${meta.name} (${meta.difficulty}, ${meta.arrowCount} arrows` +
      `${meta.timeLimitSeconds ? `, ${meta.timeLimitSeconds}s` : ""}, ${meta.attempts} attempts)\n` +
      `INSERT INTO levels (id, name, description, difficulty, status, version, arrows, attempts, time_limit_seconds, created_at, updated_at)\n` +
      `VALUES (\n` +
      `  ${sqlString(id)},\n` +
      `  ${sqlString(meta.name)},\n` +
      `  ${sqlString(meta.description)},\n` +
      `  ${sqlString(meta.difficulty)},\n` +
      `  'PUBLISHED',\n` +
      `  1,\n` +
      `  ${sqlJsonb(records)},\n` +
      `  ${meta.attempts},\n` +
      `  ${sqlNumberOrNull(meta.timeLimitSeconds)},\n` +
      `  NOW(),\n` +
      `  NOW()\n` +
      `)\nON CONFLICT (id) DO UPDATE SET\n` +
      `  name = EXCLUDED.name,\n` +
      `  description = EXCLUDED.description,\n` +
      `  difficulty = EXCLUDED.difficulty,\n` +
      `  status = EXCLUDED.status,\n` +
      `  version = EXCLUDED.version,\n` +
      `  arrows = EXCLUDED.arrows,\n` +
      `  attempts = EXCLUDED.attempts,\n` +
      `  time_limit_seconds = EXCLUDED.time_limit_seconds,\n` +
      `  updated_at = EXCLUDED.updated_at;`
  );
});

const header =
  `-- Seed 001: published levels for the Arrow Untangle catalog.\n` +
  `-- GENERATED by scripts/generate-level-seed.ts — do not edit by hand; re-run the script.\n` +
  `-- Each level is a set of bendable snake-arrows; every level is a verified DAG (solvable).\n` +
  `-- Arrows are stored as JSONB: { id, color, path:[{row,col}, ... tail->head], direction }.\n`;

const output = `${header}\n${rows.join("\n\n")}\n`;
const outputPath = join(__dirname, "..", "src", "infrastructure", "database", "seeds", "001_seed_levels.sql");
writeFileSync(outputPath, output);
process.stdout.write(`Wrote ${LEVELS.length} levels to ${outputPath}\n`);
