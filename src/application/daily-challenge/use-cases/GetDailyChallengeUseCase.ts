import { Level } from "../../../domain/level-catalog/Level.js";
import { Difficulty } from "../../../domain/level-catalog/enums/Difficulty.js";
import { Direction } from "../../../domain/level-catalog/enums/Direction.js";
import { LevelSolvabilityPolicy } from "../../../domain/level-catalog/LevelSolvabilityPolicy.js";
import { ArrowSpec } from "../../../domain/level-catalog/value-objects/ArrowSpec.js";
import { BoardShape } from "../../../domain/level-catalog/value-objects/BoardShape.js";
import { BoardSize } from "../../../domain/level-catalog/value-objects/BoardSize.js";
import { LevelDefinition } from "../../../domain/level-catalog/value-objects/LevelDefinition.js";
import { LevelDescription } from "../../../domain/level-catalog/value-objects/LevelDescription.js";
import { LevelName } from "../../../domain/level-catalog/value-objects/LevelName.js";
import { LevelVersion } from "../../../domain/level-catalog/value-objects/LevelVersion.js";
import { Position } from "../../../domain/level-catalog/value-objects/Position.js";
import { TimeLimit } from "../../../domain/level-catalog/value-objects/TimeLimit.js";
import { LevelId } from "../../../domain/shared/LevelId.js";
import { parseEnumFromInput } from "../../../shared/parseEnum.js";
import { ServiceUnavailableError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { Clock } from "../../ports/Clock.js";
import type { DailyChallengeCacheRepository } from "../ports/DailyChallengeCacheRepository.js";
import type { DailyChallengeGenerator } from "../ports/DailyChallengeGenerator.js";
import type {
  DailyChallengeDto,
  DailyChallengeSource,
} from "../DailyChallengeTypes.js";

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

const DAY_MS = 24 * 60 * 60 * 1000;
const DIFFICULTIES: readonly Difficulty[] = [
  Difficulty.EASY,
  Difficulty.MEDIUM,
  Difficulty.HARD,
];
const VALIDATION_LEVEL_ID = "00000000-0000-4000-8000-000000000218";

export type GetDailyChallengeInput = Record<string, never>;
export type GetDailyChallengeOutput = { readonly challenge: DailyChallengeDto };

export type { DailyChallengeDto, DailyChallengeSource } from "../DailyChallengeTypes.js";

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

type ChallengeContext = {
  readonly now: Date;
  readonly generatedAt: string;
  readonly date: string;
  readonly seed: string;
  readonly targetDifficulty: Difficulty;
  readonly expiresAt: string;
};

export class GetDailyChallengeUseCase
  implements UseCase<GetDailyChallengeInput, GetDailyChallengeOutput>
{
  private readonly solvabilityPolicy = new LevelSolvabilityPolicy();

  constructor(
    private readonly cache: DailyChallengeCacheRepository,
    private readonly geminiGenerator: DailyChallengeGenerator,
    private readonly fallbackGenerator: DailyChallengeGenerator,
    private readonly clock: Clock
  ) {}

  async execute(_input: GetDailyChallengeInput): Promise<GetDailyChallengeOutput> {
    const context = this.buildContext(this.clock.now());
    const cached = await this.cache.findByDate(context.date);
    if (cached !== null && this.isCurrentCache(cached.challenge, context)) {
      return { challenge: cached.challenge };
    }

    const geminiChallenge = await this.tryGenerate(this.geminiGenerator, context, "gemini");
    const challenge =
      geminiChallenge ??
      (await this.tryGenerate(this.fallbackGenerator, context, "fallback"));

    if (challenge === null) {
      throw new ServiceUnavailableError(
        "DAILY_CHALLENGE_UNAVAILABLE",
        "Daily challenge unavailable"
      );
    }

    await this.cache.save({ challenge });
    return { challenge };
  }

  private buildContext(now: Date): ChallengeContext {
    const date = utcDateKey(now);
    return {
      now,
      generatedAt: now.toISOString(),
      date,
      seed: `daily-${date}`,
      targetDifficulty: determineDailyChallengeDifficulty(date),
      expiresAt: nextUtcMidnightIso(date),
    };
  }

  private isCurrentCache(challenge: DailyChallengeDto, context: ChallengeContext): boolean {
    return (
      challenge.date === context.date &&
      challenge.seed === context.seed &&
      Date.parse(challenge.expiresAt) > context.now.getTime()
    );
  }

  private async tryGenerate(
    generator: DailyChallengeGenerator,
    context: ChallengeContext,
    source: DailyChallengeSource
  ): Promise<DailyChallengeDto | null> {
    try {
      const raw = await generator.generate({
        date: context.date,
        seed: context.seed,
        targetDifficulty: context.targetDifficulty,
        expiresAt: context.expiresAt,
      });
      return this.validateCandidate(raw, context, source);
    } catch {
      return null;
    }
  }

  private validateCandidate(
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

    if (!this.solvabilityPolicy.isSolvable(level.definition)) {
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
            path: arrow.path.map((position) => ({ row: position.row, col: position.col })),
            direction: arrow.direction,
          })),
          ...(level.boardShape !== undefined
            ? {
                boardShape: {
                  type: level.boardShape.type,
                  cells: level.boardShape.cells.map((cell) => ({
                    row: cell.row,
                    col: cell.col,
                  })),
                },
              }
            : {}),
        },
        ...(level.timeLimit !== undefined ? { timeLimitSeconds: level.timeLimit.value } : {}),
      },
    };
  }
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
