// Pattern: Strategy (deterministic level generation)
//
// Generates a playable Arrow Untangle level from constraints instead of hand-writing
// JSON. It mirrors the intent of the client `ILevelStrategy` but lives in the backend
// domain because solvability (`LevelSolvabilityPolicy`) and the level catalog live here
// (Option A: arrows are placed inside the given `BoardShape` mask, which is a placement
// mask, never a wall). Generation is deterministic — the same `seed` always yields the
// same level — using a seeded PRNG and a fixed iteration order. Arrows are produced as
// straight, in-mask, non-overlapping snakes whose head points forward (always valid
// `ArrowSpec`s); each candidate is then proven solvable by the policy and any cyclic or
// unplaceable draw is rejected and retried. After a bounded number of attempts the
// generator returns a controlled failure rather than hanging or emitting an invalid level.
import { Direction } from "./enums/Direction.js";
import type { Difficulty } from "./enums/Difficulty.js";
import { LevelSolvabilityPolicy } from "./LevelSolvabilityPolicy.js";
import { ArrowSpec } from "./value-objects/ArrowSpec.js";
import type { BoardShape } from "./value-objects/BoardShape.js";
import { LevelDefinition } from "./value-objects/LevelDefinition.js";
import type { Position } from "./value-objects/Position.js";

const PLANAR_DIRECTIONS: readonly Direction[] = [
  Direction.UP,
  Direction.DOWN,
  Direction.LEFT,
  Direction.RIGHT,
];

const ALL_DIRECTIONS: readonly Direction[] = [
  Direction.UP,
  Direction.DOWN,
  Direction.LEFT,
  Direction.RIGHT,
  Direction.FORWARD,
  Direction.BACK,
];

const DELTAS: Record<Direction, readonly [number, number, number]> = {
  [Direction.UP]: [-1, 0, 0],
  [Direction.DOWN]: [1, 0, 0],
  [Direction.LEFT]: [0, -1, 0],
  [Direction.RIGHT]: [0, 1, 0],
  [Direction.FORWARD]: [0, 0, 1],
  [Direction.BACK]: [0, 0, -1],
};

const PALETTE: readonly string[] = [
  "#4B6BFB",
  "#3FD06A",
  "#FFC83D",
  "#FF6FD8",
  "#3FC8FF",
  "#A06BFF",
  "#FF9F1C",
  "#22C9B6",
];

const DEFAULT_MAX_GENERATION_ATTEMPTS = 200;
const PLACEMENT_TRIES = 40;

export type RandomLevelOptions = {
  readonly seed: string;
  readonly difficulty: Difficulty;
  readonly shape: BoardShape;
  readonly arrowCount: number;
  readonly maxArrowLength: number;
  readonly attempts: number;
  readonly maxGenerationAttempts?: number;
};

export type RandomLevelResult =
  | {
      readonly ok: true;
      readonly definition: LevelDefinition;
      readonly boardShape: BoardShape;
      readonly difficulty: Difficulty;
    }
  | { readonly ok: false; readonly reason: string };

export class RandomLevelStrategy {
  constructor(private readonly policy: LevelSolvabilityPolicy = new LevelSolvabilityPolicy()) {}

  generate(options: RandomLevelOptions): RandomLevelResult {
    if (!Number.isInteger(options.arrowCount) || options.arrowCount < 1) {
      return { ok: false, reason: "arrowCount must be a positive integer" };
    }
    if (!Number.isInteger(options.maxArrowLength) || options.maxArrowLength < 1) {
      return { ok: false, reason: "maxArrowLength must be a positive integer" };
    }

    const maxAttempts = options.maxGenerationAttempts ?? DEFAULT_MAX_GENERATION_ATTEMPTS;
    const maskKeys = new Set(options.shape.cells.map((cell) => cell.toKey()));
    const baseSeed = hashSeed(options.seed);
    const directions = options.shape.cells.some((cell) => cell.z !== 0)
      ? ALL_DIRECTIONS
      : PLANAR_DIRECTIONS;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const rng = mulberry32(baseSeed + attempt);
      const arrows = this.tryBuild(options, maskKeys, directions, rng);
      if (arrows === null) {
        continue;
      }
      const definition = LevelDefinition.create(arrows, options.attempts);
      const cells = arrows.flatMap((arrow) => [...arrow.path]);
      if (options.shape.containsAll(cells) && this.policy.isSolvable(definition)) {
        return {
          ok: true,
          definition,
          boardShape: options.shape,
          difficulty: options.difficulty,
        };
      }
    }

    return {
      ok: false,
      reason: `Could not generate a solvable level after ${maxAttempts} attempts`,
    };
  }

  private tryBuild(
    options: RandomLevelOptions,
    maskKeys: ReadonlySet<string>,
    directions: readonly Direction[],
    rng: () => number
  ): ArrowSpec[] | null {
    const cells = options.shape.cells;
    const occupied = new Set<string>();
    const arrows: ArrowSpec[] = [];

    for (let index = 0; index < options.arrowCount; index += 1) {
      const arrow = RandomLevelStrategy.placeArrow(index, options, cells, maskKeys, directions, occupied, rng);
      if (arrow === null) {
        return null;
      }
      for (const cell of arrow.path) {
        occupied.add(cell.toKey());
      }
      arrows.push(arrow);
    }

    return arrows;
  }

  private static placeArrow(
    index: number,
    options: RandomLevelOptions,
    cells: readonly Position[],
    maskKeys: ReadonlySet<string>,
    directions: readonly Direction[],
    occupied: ReadonlySet<string>,
    rng: () => number
  ): ArrowSpec | null {
    for (let attempt = 0; attempt < PLACEMENT_TRIES; attempt += 1) {
      const start = cells[Math.floor(rng() * cells.length)]!;
      if (occupied.has(start.toKey())) {
        continue;
      }
      const direction = directions[Math.floor(rng() * directions.length)]!;
      const length = 1 + Math.floor(rng() * options.maxArrowLength);
      const path = RandomLevelStrategy.growPath(start, direction, length, maskKeys, occupied);
      if (path !== null) {
        return ArrowSpec.create(`arrow-${index}`, PALETTE[index % PALETTE.length]!, path, direction);
      }
    }
    return null;
  }

  /** Straight in-mask, non-overlapping path from `start` along `direction` (tail → head). */
  private static growPath(
    start: Position,
    direction: Direction,
    length: number,
    maskKeys: ReadonlySet<string>,
    occupied: ReadonlySet<string>
  ): Position[] | null {
    const [rowDelta, colDelta, zDelta] = DELTAS[direction];
    const path: Position[] = [];
    let current = start;

    for (let step = 0; step < length; step += 1) {
      const key = current.toKey();
      if (!maskKeys.has(key) || occupied.has(key)) {
        return null;
      }
      path.push(current);
      current = current.translate(rowDelta, colDelta, zDelta);
    }

    return path;
  }
}

/** Deterministic 32-bit hash of the seed string (FNV-1a). */
function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic seeded PRNG in [0, 1) (mulberry32). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
