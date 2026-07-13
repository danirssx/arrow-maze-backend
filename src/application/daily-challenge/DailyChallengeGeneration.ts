import { Level } from "../../domain/level-catalog/Level.js";
import { Difficulty } from "../../domain/level-catalog/enums/Difficulty.js";
import { Direction } from "../../domain/level-catalog/enums/Direction.js";
import { LevelSolvabilityPolicy } from "../../domain/level-catalog/LevelSolvabilityPolicy.js";
import { ArrowSpec } from "../../domain/level-catalog/value-objects/ArrowSpec.js";
import { BoardShape } from "../../domain/level-catalog/value-objects/BoardShape.js";
import { BoardSize } from "../../domain/level-catalog/value-objects/BoardSize.js";
import { LevelDefinition } from "../../domain/level-catalog/value-objects/LevelDefinition.js";
import { LevelDescription } from "../../domain/level-catalog/value-objects/LevelDescription.js";
import { LevelName } from "../../domain/level-catalog/value-objects/LevelName.js";
import { LevelVersion } from "../../domain/level-catalog/value-objects/LevelVersion.js";
import { Position } from "../../domain/level-catalog/value-objects/Position.js";
import { TimeLimit } from "../../domain/level-catalog/value-objects/TimeLimit.js";
import { LevelId } from "../../domain/shared/LevelId.js";
import { parseEnumFromInput } from "../../shared/parseEnum.js";
import type { DailyChallengeDto, DailyChallengeSource } from "./DailyChallengeTypes.js";

/**
 * Shared, framework-free daily-challenge generation helpers.
 *
 * The context builder and provider-candidate validator are used by both
 * `GetDailyChallengeUseCase` (MAZ-218 public read/generate) and
 * `StartDailyChallengeIterationUseCase` (MAZ-224 admin manual iteration) so the
 * Gemini/fallback validation pipeline has a single source of truth. Provider
 * output is always untrusted: every candidate must pass level-catalog value
 * objects and `LevelSolvabilityPolicy` before it becomes a DTO.
 */

type PositionInput = { row: number; col: number };
type ArrowInput = {
  id: string;
  color: string;
  path: PositionInput[];
  direction?: string;
};
type BoardShapeInput = {
  type: string;
  cells: PositionInput[];
};
type BoardSizeInput = {
  rows: number;
  cols: number;
};

type Candidate = {
  readonly date: string;
  readonly seed: string;
  readonly targetDifficulty: string;
  readonly level: {
    readonly name: string;
    readonly description: string;
    readonly difficulty: string;
    readonly definition: {
      readonly attempts?: number;
      readonly arrows: ArrowInput[];
      readonly boardShape?: BoardShapeInput;
      readonly boardSize?: BoardSizeInput;
    };
    readonly timeLimitSeconds?: number;
  };
};

export type ChallengeContext = {
  readonly now: Date;
  readonly generatedAt: string;
  readonly date: string;
  readonly seed: string;
  readonly targetDifficulty: Difficulty;
  readonly expiresAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DIFFICULTIES: readonly Difficulty[] = [
  Difficulty.EASY,
  Difficulty.MEDIUM,
  Difficulty.HARD,
];
const VALIDATION_LEVEL_ID = "00000000-0000-4000-8000-000000000218";

const solvabilityPolicy = new LevelSolvabilityPolicy();

export function buildChallengeContext(
  now: Date,
  dateKey?: string,
  seedOverride?: string
): ChallengeContext {
  const date = dateKey ?? utcDateKey(now);
  return {
    now,
    generatedAt: now.toISOString(),
    date,
    seed: seedOverride ?? `daily-${date}`,
    targetDifficulty: determineDailyChallengeDifficulty(date),
    expiresAt: nextUtcMidnightIso(date),
  };
}

export function validateDailyChallengeCandidate(
  raw: unknown,
  context: ChallengeContext,
  source: DailyChallengeSource
): DailyChallengeDto {
  if (!isRecord(raw)) throw new Error("Invalid daily challenge candidate");
  const candidate = raw as Partial<Candidate>;
  if (
    candidate.date !== context.date ||
    candidate.seed !== context.seed ||
    candidate.targetDifficulty !== context.targetDifficulty ||
    !isRecord(candidate.level) ||
    !isRecord(candidate.level.definition) ||
    !Array.isArray(candidate.level.definition.arrows)
  ) {
    throw new Error("Invalid daily challenge metadata");
  }

  const difficulty = parseEnumFromInput(Difficulty, String(candidate.level.difficulty), "difficulty");
  if (difficulty !== context.targetDifficulty) {
    throw new Error("Invalid daily challenge difficulty");
  }

  const arrows = candidate.level.definition.arrows.map((arrow) => mapArrowCandidate(arrow));
  const boardShape = mapBoardFrameInput(
    candidate.level.definition.boardShape,
    candidate.level.definition.boardSize
  );
  const definition = LevelDefinition.create(arrows, candidate.level.definition.attempts);
  const timeLimit =
    candidate.level.timeLimitSeconds !== undefined
      ? TimeLimit.create(candidate.level.timeLimitSeconds)
      : undefined;
  const level = Level.draft(
    LevelId.create(VALIDATION_LEVEL_ID),
    LevelName.create(String(candidate.level.name)),
    LevelDescription.create(String(candidate.level.description)),
    definition,
    difficulty,
    LevelVersion.initial(),
    context.now,
    timeLimit,
    boardShape
  );

  if (!solvabilityPolicy.isSolvable(level.definition)) {
    throw new Error("Daily challenge is unsolvable");
  }

  return {
    date: context.date,
    seed: context.seed,
    targetDifficulty: context.targetDifficulty,
    source,
    generatedAt: context.generatedAt,
    expiresAt: context.expiresAt,
    validation: {
      solvable: true,
      difficultyMatched: true,
      fallbackUsed: source === "fallback",
    },
    level: {
      name: level.name.value,
      description: level.description.value,
      difficulty: level.difficulty,
      definition: {
        attempts: level.definition.attempts,
        arrows: level.definition.arrows.map((arrow) => ({
          id: arrow.id,
          color: arrow.color,
          path: arrow.path.map((position) => ({ row: position.row, col: position.col, z: position.z })),
          direction: arrow.direction,
        })),
        ...(level.boardShape !== undefined
          ? {
              boardShape: {
                type: level.boardShape.type,
                cells: level.boardShape.cells.map((cell) => ({
                  row: cell.row,
                  col: cell.col,
                  z: cell.z,
                })),
              },
            }
          : {}),
      },
      ...(level.timeLimit !== undefined ? { timeLimitSeconds: level.timeLimit.value } : {}),
    },
  };
}

export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function nextUtcMidnightIso(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString();
}

export function determineDailyChallengeDifficulty(dateKey: string): Difficulty {
  const { year, month, day } = parseDateKey(dateKey);
  const daysSinceEpoch = Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
  return DIFFICULTIES[daysSinceEpoch % DIFFICULTIES.length]!;
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const parts = dateKey.split("-").map((part) => Number(part));
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error("Invalid UTC date key");
  }
  return { year, month, day };
}

function mapBoardFrameInput(
  boardShapeInput: BoardShapeInput | undefined,
  boardSizeInput: BoardSizeInput | undefined
): BoardShape | undefined {
  if (boardShapeInput !== undefined && boardSizeInput !== undefined) {
    throw new Error("boardSize and boardShape cannot be combined");
  }
  if (boardSizeInput !== undefined) {
    return BoardShape.cellMask(BoardSize.create(boardSizeInput.rows, boardSizeInput.cols).toCells());
  }
  if (boardShapeInput !== undefined) {
    return BoardShape.create(
      boardShapeInput.type,
      boardShapeInput.cells.map((cell) => Position.create(cell.row, cell.col))
    );
  }
  return undefined;
}

function mapArrowCandidate(input: ArrowInput): ArrowSpec {
  if (input.direction === undefined) {
    throw new Error("Arrow direction is required");
  }
  return ArrowSpec.create(
    input.id,
    input.color,
    input.path.map((position) => Position.create(position.row, position.col)),
    parseEnumFromInput(Direction, input.direction, "direction")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
