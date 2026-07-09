/**
 * Optional authoring tool — generates dense Arrow Untangle level JSON files into
 * prisma/seed-data/level-json/ (one `<order>-<slug>.json` per level). It is NOT part
 * of the seed: prisma/seed.ts reads the JSON folder directly. Re-run to regenerate the
 * procedural levels; hand-authored JSON files (e.g. abstract shaped boards) are left
 * untouched. Each board is still validated as a solvable DAG before it is written.
 *
 * The published levels are dense Arrow Untangle boards inspired by the original
 * Arrow Maze: many short and medium bendable arrows packed into a compact dotted
 * field. Each level is generated from one monotonic direction family. Under that
 * rule every blocking edge moves in one global rank direction, so the blocking
 * graph is acyclic. The script still validates that claim through the real
 * `ArrowSpec`, `LevelDefinition`, and `LevelSolvabilityPolicy` domain objects
 * before writing the seed. It also rejects any generated board with overlapping
 * cells, which the domain currently allows but the visual game should not.
 *
 * Run with: `npm run seed:generate` (or `npx tsx scripts/generate-level-seed.ts`).
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { Direction } from "../src/domain/level-catalog/enums/Direction.js";
import { Difficulty } from "../src/domain/level-catalog/enums/Difficulty.js";
import { LevelSolvabilityPolicy } from "../src/domain/level-catalog/LevelSolvabilityPolicy.js";
import { ArrowSpec } from "../src/domain/level-catalog/value-objects/ArrowSpec.js";
import { LevelDefinition } from "../src/domain/level-catalog/value-objects/LevelDefinition.js";
import { Position } from "../src/domain/level-catalog/value-objects/Position.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

type Cell = {
  row: number;
  col: number;
};

type ArrowRecord = {
  id: string;
  color: string;
  path: Cell[];
  direction: Direction;
};

type FamilyName = "UP_RIGHT" | "RIGHT_DOWN" | "DOWN_LEFT" | "LEFT_UP";

type DirectionFamily = {
  name: FamilyName;
  directions: readonly Direction[];
  tailToHeadSteps: readonly Direction[];
};

type LevelMeta = {
  name: string;
  description: string;
  difficulty: Difficulty;
  arrowCount: number;
  attempts: number;
  rows: number;
  cols: number;
  family: FamilyName;
  seed: number;
  minBodyCells: number;
  maxBodyCells: number;
  minDensity: number;
  minBlockedArrows: number;
  timeLimitSeconds?: number;
  /** Optional ASCII-art mask ('#' = playable cell). When present the level is a shaped
   *  board (Option A): arrows are confined to the mask and a `boardShape` is emitted. */
  mask?: string[];
  /** Explicit level id (defaults to the sequential `levelId(index)` of the base 15). */
  id?: string;
  /** Explicit catalog order / level number (defaults to `index + 1`). */
  order?: number;
};

/** A playable region: either the full rectangle or a shaped cell mask. */
type Region = {
  set: ReadonlySet<string>;
  cells: readonly Cell[];
  count: number;
  masked: boolean;
};

type GeneratedLevel = {
  records: ArrowRecord[];
  occupiedCells: number;
  density: number;
  blockedArrows: number;
  region: Region;
};

type Candidate = {
  record: ArrowRecord;
  score: number;
};

const COLORS = ["blue", "green", "yellow", "pink", "cyan", "purple", "crimson", "white", "orange", "teal"];

const DIRECTION_DELTAS: Record<Direction, Cell> = {
  [Direction.UP]: { row: -1, col: 0 },
  [Direction.DOWN]: { row: 1, col: 0 },
  [Direction.LEFT]: { row: 0, col: -1 },
  [Direction.RIGHT]: { row: 0, col: 1 }
};

const FAMILIES: Record<FamilyName, DirectionFamily> = {
  UP_RIGHT: {
    name: "UP_RIGHT",
    directions: [Direction.UP, Direction.RIGHT],
    tailToHeadSteps: [Direction.UP, Direction.RIGHT]
  },
  RIGHT_DOWN: {
    name: "RIGHT_DOWN",
    directions: [Direction.RIGHT, Direction.DOWN],
    tailToHeadSteps: [Direction.RIGHT, Direction.DOWN]
  },
  DOWN_LEFT: {
    name: "DOWN_LEFT",
    directions: [Direction.DOWN, Direction.LEFT],
    tailToHeadSteps: [Direction.DOWN, Direction.LEFT]
  },
  LEFT_UP: {
    name: "LEFT_UP",
    directions: [Direction.LEFT, Direction.UP],
    tailToHeadSteps: [Direction.LEFT, Direction.UP]
  }
};

const CANDIDATES_PER_ARROW = 2500;
const LEVEL_GENERATION_ATTEMPTS = 80;

class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 2 ** 32;
  }

  integer(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    return items[this.integer(items.length)]!;
  }
}

function color(index: number): string {
  return COLORS[index % COLORS.length] ?? "blue";
}

function arrowId(index: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let value = index;
  let id = "";
  do {
    id = `${alphabet[value % alphabet.length]}${id}`;
    value = Math.floor(value / alphabet.length) - 1;
  } while (value >= 0);
  return id;
}

function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

function translate(cell: Cell, direction: Direction): Cell {
  const delta = DIRECTION_DELTAS[direction];
  return { row: cell.row + delta.row, col: cell.col + delta.col };
}

/**
 * Builds the playable region for a level: every '#' cell of the ASCII `mask` when
 * present (a shaped board), otherwise the full `rows x cols` rectangle. `meta.rows`
 * /`meta.cols` must match the mask's bounding box.
 */
function buildRegion(meta: LevelMeta): Region {
  const cells: Cell[] = [];
  if (meta.mask !== undefined) {
    meta.mask.forEach((line, row) => {
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] === "#") cells.push({ row, col });
      }
    });
  } else {
    for (let row = 0; row < meta.rows; row += 1) {
      for (let col = 0; col < meta.cols; col += 1) {
        cells.push({ row, col });
      }
    }
  }
  return {
    cells,
    set: new Set(cells.map(cellKey)),
    count: cells.length,
    masked: meta.mask !== undefined,
  };
}

function isStrictlyAhead(head: Cell, direction: Direction, cell: Cell): boolean {
  switch (direction) {
    case Direction.UP:
      return cell.col === head.col && cell.row < head.row;
    case Direction.DOWN:
      return cell.col === head.col && cell.row > head.row;
    case Direction.LEFT:
      return cell.row === head.row && cell.col < head.col;
    case Direction.RIGHT:
      return cell.row === head.row && cell.col > head.col;
  }
}

function blocks(blocked: ArrowRecord, blocker: ArrowRecord): boolean {
  const head = blocked.path[blocked.path.length - 1]!;
  return blocker.path.some((cell) => isStrictlyAhead(head, blocked.direction, cell));
}

function countBlockedArrows(records: readonly ArrowRecord[]): number {
  return records.filter((blocked) =>
    records.some((blocker) => blocker.id !== blocked.id && blocks(blocked, blocker))
  ).length;
}

function directionCounts(records: readonly ArrowRecord[]): Record<Direction, number> {
  return records.reduce<Record<Direction, number>>(
    (counts, record) => {
      counts[record.direction] += 1;
      return counts;
    },
    {
      [Direction.UP]: 0,
      [Direction.DOWN]: 0,
      [Direction.LEFT]: 0,
      [Direction.RIGHT]: 0
    }
  );
}

function randomMonotonePath(rng: Rng, meta: LevelMeta, region: Region): Cell[] | undefined {
  const family = FAMILIES[meta.family];
  // Masked boards pick a start from the mask cells (1 draw); rectangles keep the
  // original row/col draws (2 draws) so the base 15 levels regenerate identically.
  const start: Cell = region.masked
    ? region.cells[rng.integer(region.count)]!
    : { row: rng.integer(meta.rows), col: rng.integer(meta.cols) };
  const targetLength = 1 + meta.minBodyCells + rng.integer(meta.maxBodyCells - meta.minBodyCells + 1);
  const path: Cell[] = [start];
  const seen = new Set<string>([cellKey(start)]);
  let current = start;
  let previousStep: Direction | undefined;

  for (let index = 1; index < targetLength; index += 1) {
    const steps = family.tailToHeadSteps
      .map((step) => ({
        step,
        score: (step === previousStep ? 1.4 : 1) + rng.next()
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ step }) => step);

    let nextCell: Cell | undefined;
    let selectedStep: Direction | undefined;
    for (const step of steps) {
      const candidate = translate(current, step);
      if (!region.set.has(cellKey(candidate))) continue;
      if (seen.has(cellKey(candidate))) continue;
      nextCell = candidate;
      selectedStep = step;
      break;
    }

    if (nextCell === undefined || selectedStep === undefined) {
      return undefined;
    }

    path.push(nextCell);
    seen.add(cellKey(nextCell));
    current = nextCell;
    previousStep = selectedStep;
  }

  return path;
}

function makeCandidate(
  rng: Rng,
  meta: LevelMeta,
  arrowIndex: number,
  occupied: ReadonlySet<string>,
  existing: readonly ArrowRecord[],
  region: Region
): Candidate | undefined {
  const path = randomMonotonePath(rng, meta, region);
  if (path === undefined || path.some((cell) => occupied.has(cellKey(cell)))) {
    return undefined;
  }

  const remainingArrows = meta.arrowCount - arrowIndex - 1;
  const minPathLength = 1 + meta.minBodyCells;
  const remainingCells = region.count - occupied.size;
  if (path.length > remainingCells - remainingArrows * minPathLength) {
    return undefined;
  }

  const family = FAMILIES[meta.family];
  const counts = directionCounts(existing);
  const direction = family.directions
    .map((candidateDirection) => ({
      direction: candidateDirection,
      score: 2 / (1 + counts[candidateDirection]) + rng.next()
    }))
    .sort((a, b) => b.score - a.score)[0]!.direction;

  const record: ArrowRecord = {
    id: arrowId(arrowIndex),
    color: color(arrowIndex),
    path,
    direction
  };

  const blockedByExisting = existing.filter((blocker) => blocks(record, blocker)).length;
  const blocksExisting = existing.filter((blocked) => blocks(blocked, record)).length;
  const touchesEdge = path.some(
    (cell) => cell.row === 0 || cell.row === meta.rows - 1 || cell.col === 0 || cell.col === meta.cols - 1
  );
  const score =
    path.length * 4 +
    blockedByExisting * 8 +
    blocksExisting * 4 +
    (touchesEdge ? 0.6 : 0) +
    rng.next();

  return { record, score };
}

function generateLevel(meta: LevelMeta): GeneratedLevel {
  const region = buildRegion(meta);
  let bestSummary = "no candidates";
  for (let attempt = 0; attempt < LEVEL_GENERATION_ATTEMPTS; attempt += 1) {
    const rng = new Rng(meta.seed + attempt * 10007);
    const records: ArrowRecord[] = [];
    const occupied = new Set<string>();

    for (let arrowIndex = 0; arrowIndex < meta.arrowCount; arrowIndex += 1) {
      let best: Candidate | undefined;
      for (let candidateIndex = 0; candidateIndex < CANDIDATES_PER_ARROW; candidateIndex += 1) {
        const candidate = makeCandidate(rng, meta, arrowIndex, occupied, records, region);
        if (candidate !== undefined && (best === undefined || candidate.score > best.score)) {
          best = candidate;
        }
      }

      if (best === undefined) {
        break;
      }

      records.push(best.record);
      for (const cell of best.record.path) {
        occupied.add(cellKey(cell));
      }
    }

    const density = occupied.size / region.count;
    const blockedArrows = countBlockedArrows(records);
    if (records.length > 0) {
      bestSummary =
        `${records.length} arrows, ${occupied.size}/${region.count} cells ` +
        `(${Math.round(density * 100)}%), ${blockedArrows} blocked`;
    }
    if (
      records.length === meta.arrowCount &&
      density >= meta.minDensity &&
      blockedArrows >= meta.minBlockedArrows
    ) {
      return {
        records,
        occupiedCells: occupied.size,
        density,
        blockedArrows,
        region
      };
    }
  }

  throw new Error(`Could not generate level "${meta.name}" within quality thresholds; best: ${bestSummary}`);
}

function toArrowSpec(record: ArrowRecord): ArrowSpec {
  return ArrowSpec.create(
    record.id,
    record.color,
    record.path.map((cell) => Position.create(cell.row, cell.col)),
    record.direction
  );
}

function assertNoOverlaps(meta: LevelMeta, records: readonly ArrowRecord[]): void {
  const occupied = new Map<string, string>();
  for (const record of records) {
    for (const cell of record.path) {
      const key = cellKey(cell);
      const existingArrowId = occupied.get(key);
      if (existingArrowId !== undefined) {
        throw new Error(`Level "${meta.name}" overlaps ${existingArrowId} and ${record.id} at ${key}`);
      }
      occupied.set(key, record.id);
    }
  }
}

function assertLevelQuality(meta: LevelMeta, generated: GeneratedLevel): void {
  if (generated.records.length !== meta.arrowCount) {
    throw new Error(`Level "${meta.name}" generated ${generated.records.length} arrows, expected ${meta.arrowCount}`);
  }
  if (generated.density < meta.minDensity) {
    throw new Error(`Level "${meta.name}" density ${generated.density.toFixed(2)} is below ${meta.minDensity}`);
  }
  if (generated.blockedArrows < meta.minBlockedArrows) {
    throw new Error(
      `Level "${meta.name}" has ${generated.blockedArrows} blocked arrows, expected at least ${meta.minBlockedArrows}`
    );
  }
  assertNoOverlaps(meta, generated.records);

  const singleCell = generated.records.find((record) => record.path.length < 2);
  if (singleCell !== undefined) {
    throw new Error(`Level "${meta.name}" has a single-cell arrow ${singleCell.id} (min length is 2)`);
  }

  const definition = LevelDefinition.create(generated.records.map(toArrowSpec), meta.attempts);
  const policy = new LevelSolvabilityPolicy();
  if (!policy.isSolvable(definition)) {
    throw new Error(`Level "${meta.name}" is not solvable (blocking graph has a cycle)`);
  }
}

const LEVELS: LevelMeta[] = [
  {
    name: "Packed Start",
    description: "A compact board with real blockers from the first move.",
    difficulty: Difficulty.EASY,
    arrowCount: 12,
    attempts: 6,
    rows: 8,
    cols: 8,
    family: "UP_RIGHT",
    seed: 2000,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.64,
    minBlockedArrows: 7
  },
  {
    name: "Sidewinder",
    description: "Short snakes fill the lane and force a right extraction order.",
    difficulty: Difficulty.EASY,
    arrowCount: 14,
    attempts: 6,
    rows: 8,
    cols: 9,
    family: "RIGHT_DOWN",
    seed: 2137,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.66,
    minBlockedArrows: 9
  },
  {
    name: "Dense Crossings",
    description: "A fuller grid where most arrows start behind another body.",
    difficulty: Difficulty.EASY,
    arrowCount: 16,
    attempts: 6,
    rows: 9,
    cols: 9,
    family: "DOWN_LEFT",
    seed: 2274,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.68,
    minBlockedArrows: 11
  },
  {
    name: "Corner Weave",
    description: "Bends collect in the corners and open only after careful clears.",
    difficulty: Difficulty.EASY,
    arrowCount: 18,
    attempts: 6,
    rows: 9,
    cols: 10,
    family: "LEFT_UP",
    seed: 2411,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.7,
    minBlockedArrows: 13
  },
  {
    name: "Full Weave",
    description: "Twenty arrows packed tightly enough to punish random tapping.",
    difficulty: Difficulty.EASY,
    arrowCount: 20,
    attempts: 6,
    rows: 10,
    cols: 10,
    family: "UP_RIGHT",
    seed: 2548,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.72,
    minBlockedArrows: 15
  },
  {
    name: "Medium Gridlock",
    description: "The medium tier starts with a crowded board and fewer free rays.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 22,
    attempts: 5,
    rows: 10,
    cols: 11,
    family: "RIGHT_DOWN",
    seed: 2685,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.72,
    minBlockedArrows: 17
  },
  {
    name: "Rush Grid",
    description: "A dense timed board with only a few immediately open exits.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 24,
    attempts: 5,
    rows: 11,
    cols: 12,
    family: "DOWN_LEFT",
    seed: 2822,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.72,
    minBlockedArrows: 18,
    timeLimitSeconds: 110
  },
  {
    name: "Lattice Lock",
    description: "Longer bends make the lattice feel full without overlapping.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 26,
    attempts: 5,
    rows: 12,
    cols: 12,
    family: "LEFT_UP",
    seed: 2959,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.72,
    minBlockedArrows: 20
  },
  {
    name: "Pressure Mesh",
    description: "A timed mesh where most visible heads are not ready yet.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 28,
    attempts: 5,
    rows: 12,
    cols: 13,
    family: "UP_RIGHT",
    seed: 3096,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.73,
    minBlockedArrows: 22,
    timeLimitSeconds: 105
  },
  {
    name: "Medium Finale",
    description: "Thirty arrows close the tier with a nearly full field.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 30,
    attempts: 5,
    rows: 13,
    cols: 13,
    family: "RIGHT_DOWN",
    seed: 3233,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.73,
    minBlockedArrows: 24,
    timeLimitSeconds: 100
  },
  {
    name: "Hard Stack",
    description: "Hard boards begin with high density and fewer safe guesses.",
    difficulty: Difficulty.HARD,
    arrowCount: 32,
    attempts: 4,
    rows: 13,
    cols: 13,
    family: "DOWN_LEFT",
    seed: 3370,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.74,
    minBlockedArrows: 26
  },
  {
    name: "Hard Timer",
    description: "A large timed board with blockers chained through the center.",
    difficulty: Difficulty.HARD,
    arrowCount: 34,
    attempts: 4,
    rows: 13,
    cols: 14,
    family: "LEFT_UP",
    seed: 3507,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.74,
    minBlockedArrows: 28,
    timeLimitSeconds: 105
  },
  {
    name: "Hard Mesh",
    description: "Dense lanes and long bodies leave very few clean first choices.",
    difficulty: Difficulty.HARD,
    arrowCount: 36,
    attempts: 4,
    rows: 14,
    cols: 14,
    family: "UP_RIGHT",
    seed: 3644,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.75,
    minBlockedArrows: 30,
    timeLimitSeconds: 100
  },
  {
    name: "Hard Snarl",
    description: "Thirty-eight arrows snarl together in a tight solvable order.",
    difficulty: Difficulty.HARD,
    arrowCount: 38,
    attempts: 4,
    rows: 14,
    cols: 15,
    family: "RIGHT_DOWN",
    seed: 3781,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.75,
    minBlockedArrows: 32,
    timeLimitSeconds: 95
  },
  {
    name: "Hard Finale",
    description: "Forty arrows, a packed board, and almost no room for mistakes.",
    difficulty: Difficulty.HARD,
    arrowCount: 40,
    attempts: 3,
    rows: 15,
    cols: 15,
    family: "DOWN_LEFT",
    seed: 3918,
    minBodyCells: 2,
    maxBodyCells: 5,
    minDensity: 0.76,
    minBlockedArrows: 34,
    timeLimitSeconds: 90
  },
  // ---- Shaped boards (Option A): recognizable masks, dense, multi-cell arrows. ----
  {
    name: "Heart Tangle",
    description: "A heart packed with bendable arrows — clear it from the inside out.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 21,
    attempts: 6,
    rows: 12,
    cols: 16,
    family: "UP_RIGHT",
    seed: 5000,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.45,
    minBlockedArrows: 6,
    id: "550e8400-e29b-41d4-a716-446655440040",
    order: 17,
    mask: [
      "..####....####..",
      ".##############.",
      "################",
      "################",
      "################",
      ".##############.",
      "..############..",
      "...##########...",
      "....########....",
      ".....######.....",
      "......####......",
      ".......##......."
    ]
  },
  {
    name: "Diamond Drift",
    description: "A faceted diamond where every ray hides behind another.",
    difficulty: Difficulty.EASY,
    arrowCount: 10,
    attempts: 6,
    rows: 11,
    cols: 15,
    family: "RIGHT_DOWN",
    seed: 5100,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.42,
    minBlockedArrows: 3,
    id: "550e8400-e29b-41d4-a716-446655440041",
    order: 18,
    mask: [
      ".......#.......",
      "......###......",
      ".....#####.....",
      "....#######....",
      "...#########...",
      "..###########..",
      "...#########...",
      "....#######....",
      ".....#####.....",
      "......###......",
      ".......#......."
    ]
  },
  {
    name: "Pyramid Climb",
    description: "A solid pyramid — work the base before the peak frees up.",
    difficulty: Difficulty.EASY,
    arrowCount: 11,
    attempts: 6,
    rows: 8,
    cols: 15,
    family: "DOWN_LEFT",
    seed: 5200,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.42,
    minBlockedArrows: 3,
    id: "550e8400-e29b-41d4-a716-446655440042",
    order: 19,
    mask: [
      ".......#.......",
      "......###......",
      ".....#####.....",
      "....#######....",
      "...#########...",
      "..###########..",
      ".#############.",
      "###############"
    ]
  },
  {
    name: "Plus Pressure",
    description: "A bold plus sign with four crowded arms.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 12,
    attempts: 6,
    rows: 13,
    cols: 13,
    family: "LEFT_UP",
    seed: 5300,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.45,
    minBlockedArrows: 4,
    id: "550e8400-e29b-41d4-a716-446655440043",
    order: 20,
    mask: [
      ".....###.....",
      ".....###.....",
      ".....###.....",
      ".....###.....",
      ".....###.....",
      "#############",
      "#############",
      "#############",
      ".....###.....",
      ".....###.....",
      ".....###.....",
      ".....###.....",
      ".....###....."
    ]
  },
  {
    name: "Arrow Ascent",
    description: "An arrow pointing up, snarled along its head and stem.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 13,
    attempts: 6,
    rows: 12,
    cols: 15,
    family: "UP_RIGHT",
    seed: 5400,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.45,
    minBlockedArrows: 4,
    id: "550e8400-e29b-41d4-a716-446655440044",
    order: 21,
    mask: [
      ".......#.......",
      "......###......",
      ".....#####.....",
      "....#######....",
      "...#########...",
      "..###########..",
      ".#############.",
      "###############",
      "......###......",
      "......###......",
      "......###......",
      "......###......"
    ]
  },
  {
    name: "Hex Lockdown",
    description: "A full hexagon — a dense honeycomb of blockers.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 14,
    attempts: 6,
    rows: 9,
    cols: 14,
    family: "RIGHT_DOWN",
    seed: 5500,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.48,
    minBlockedArrows: 5,
    id: "550e8400-e29b-41d4-a716-446655440045",
    order: 22,
    mask: [
      "....######....",
      "...########...",
      "..##########..",
      ".############.",
      "##############",
      ".############.",
      "..##########..",
      "...########...",
      "....######...."
    ]
  },
  {
    name: "Cat Nap",
    description: "A cat's head, ears and all, fully tangled.",
    difficulty: Difficulty.HARD,
    arrowCount: 17,
    attempts: 5,
    rows: 11,
    cols: 13,
    family: "DOWN_LEFT",
    seed: 5600,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.48,
    minBlockedArrows: 6,
    id: "550e8400-e29b-41d4-a716-446655440046",
    order: 23,
    mask: [
      "##.........##",
      "###.......###",
      "#############",
      "#############",
      "#############",
      "#############",
      "#############",
      ".###########.",
      "..#########..",
      "...#######...",
      "....#####...."
    ]
  },
  {
    name: "Ghost Grid",
    description: "A wavy-footed ghost stuffed with arrows.",
    difficulty: Difficulty.HARD,
    arrowCount: 18,
    attempts: 5,
    rows: 11,
    cols: 12,
    family: "LEFT_UP",
    seed: 5700,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.48,
    minBlockedArrows: 6,
    id: "550e8400-e29b-41d4-a716-446655440047",
    order: 24,
    mask: [
      "...######...",
      "..########..",
      ".##########.",
      "############",
      "############",
      "############",
      "############",
      "############",
      "############",
      "############",
      "#.##.##.##.#"
    ]
  },
  {
    name: "Home Stretch",
    description: "A little house — roof, walls and a door, all knotted.",
    difficulty: Difficulty.MEDIUM,
    arrowCount: 15,
    attempts: 6,
    rows: 12,
    cols: 13,
    family: "UP_RIGHT",
    seed: 5800,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.45,
    minBlockedArrows: 5,
    id: "550e8400-e29b-41d4-a716-446655440048",
    order: 25,
    mask: [
      "......#......",
      ".....###.....",
      "....#####....",
      "...#######...",
      "..#########..",
      ".###########.",
      "#############",
      ".###########.",
      ".###########.",
      ".####...####.",
      ".####...####.",
      ".####...####."
    ]
  },
  {
    name: "Full Moon",
    description: "A round disc packed edge to edge.",
    difficulty: Difficulty.HARD,
    arrowCount: 18,
    attempts: 5,
    rows: 11,
    cols: 13,
    family: "RIGHT_DOWN",
    seed: 5900,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.5,
    minBlockedArrows: 6,
    id: "550e8400-e29b-41d4-a716-446655440049",
    order: 26,
    mask: [
      "....#####....",
      "..#########..",
      ".###########.",
      ".###########.",
      "#############",
      "#############",
      "#############",
      ".###########.",
      ".###########.",
      "..#########..",
      "....#####...."
    ]
  },
  {
    name: "Octa Crush",
    description: "An octagon at maximum density — the toughest shaped finale.",
    difficulty: Difficulty.HARD,
    arrowCount: 19,
    attempts: 4,
    rows: 11,
    cols: 13,
    family: "DOWN_LEFT",
    seed: 6000,
    minBodyCells: 1,
    maxBodyCells: 4,
    minDensity: 0.5,
    minBlockedArrows: 7,
    id: "550e8400-e29b-41d4-a716-446655440050",
    order: 27,
    mask: [
      "...#######...",
      "..#########..",
      ".###########.",
      "#############",
      "#############",
      "#############",
      "#############",
      "#############",
      ".###########.",
      "..#########..",
      "...#######..."
    ]
  }
];

function levelId(index: number): string {
  // Reuse the first three ids referenced by prisma/seed.ts demo data; extend sequentially.
  return `550e8400-e29b-41d4-a716-4466554400${String(10 + index).padStart(2, "0")}`;
}

type CatalogLevelJson = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  order: number;
  attempts: number;
  timeLimitSeconds?: number;
  arrows: ArrowRecord[];
  boardShape?: { type: "CELL_MASK"; cells: Cell[] };
};

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const outputDir = join(__dirname, "..", "prisma", "seed-data", "level-json");
mkdirSync(outputDir, { recursive: true });
const summaries: string[] = [];

LEVELS.forEach((meta, index) => {
  const generated = generateLevel(meta);
  assertLevelQuality(meta, generated);

  const order = meta.order ?? index + 1;
  const level: CatalogLevelJson = {
    id: meta.id ?? levelId(index),
    name: meta.name,
    description: meta.description,
    difficulty: meta.difficulty,
    order,
    attempts: meta.attempts,
    ...(meta.timeLimitSeconds !== undefined ? { timeLimitSeconds: meta.timeLimitSeconds } : {}),
    arrows: generated.records,
    ...(generated.region.masked
      ? { boardShape: { type: "CELL_MASK" as const, cells: [...generated.region.cells] } }
      : {})
  };
  const fileName = `${String(order).padStart(2, "0")}-${slug(meta.name)}.json`;
  writeFileSync(join(outputDir, fileName), `${JSON.stringify(level, null, 2)}\n`);
  summaries.push(
    `Level ${order}: ${meta.name} -> ${fileName} (${generated.records.length} arrows, ` +
      `${Math.round(generated.density * 100)}% density, ${generated.blockedArrows} blocked)`
  );
});

process.stdout.write(
  `Wrote ${LEVELS.length} catalog level JSON files to ${outputDir}\n${summaries.join("\n")}\n`
);
