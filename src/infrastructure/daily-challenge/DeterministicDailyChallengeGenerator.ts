// Pattern: Strategy
import { Difficulty } from "../../domain/level-catalog/enums/Difficulty.js";
import { RandomLevelStrategy } from "../../domain/level-catalog/RandomLevelStrategy.js";
import { BoardShape } from "../../domain/level-catalog/value-objects/BoardShape.js";
import { BoardSize } from "../../domain/level-catalog/value-objects/BoardSize.js";
import type {
  DailyChallengeGenerator,
  DailyChallengeGeneratorInput,
} from "../../application/daily-challenge/ports/DailyChallengeGenerator.js";

type DifficultyConfig = {
  readonly rows: number;
  readonly cols: number;
  readonly arrowCount: number;
  readonly maxArrowLength: number;
  readonly attempts: number;
  readonly timeLimitSeconds?: number;
};

const CONFIG_BY_DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.EASY]: { rows: 5, cols: 5, arrowCount: 4, maxArrowLength: 2, attempts: 8 },
  [Difficulty.MEDIUM]: { rows: 6, cols: 6, arrowCount: 7, maxArrowLength: 3, attempts: 6, timeLimitSeconds: 180 },
  [Difficulty.HARD]: { rows: 7, cols: 7, arrowCount: 10, maxArrowLength: 4, attempts: 5, timeLimitSeconds: 150 },
};

export class DeterministicDailyChallengeGenerator implements DailyChallengeGenerator {
  constructor(private readonly strategy = new RandomLevelStrategy()) {}

  async generate(input: DailyChallengeGeneratorInput): Promise<unknown> {
    const difficulty = parseDifficulty(input.targetDifficulty);
    const config = CONFIG_BY_DIFFICULTY[difficulty];
    const boardShape = BoardShape.cellMask(BoardSize.create(config.rows, config.cols).toCells());
    const result = this.strategy.generate({
      seed: input.seed,
      difficulty,
      shape: boardShape,
      arrowCount: config.arrowCount,
      maxArrowLength: config.maxArrowLength,
      attempts: config.attempts,
    });

    if (!result.ok) {
      return null;
    }

    return {
      date: input.date,
      seed: input.seed,
      targetDifficulty: difficulty,
      level: {
        name: `Daily Challenge ${input.date}`,
        description: "A deterministic fallback Arrow Untangle puzzle.",
        difficulty,
        definition: {
          attempts: result.definition.attempts,
          arrows: result.definition.arrows.map((arrow) => ({
            id: arrow.id,
            color: arrow.color,
            path: arrow.path.map((position) => ({ row: position.row, col: position.col })),
            direction: arrow.direction,
          })),
          boardShape: {
            type: result.boardShape.type,
            cells: result.boardShape.cells.map((cell) => ({ row: cell.row, col: cell.col })),
          },
        },
        ...(config.timeLimitSeconds !== undefined
          ? { timeLimitSeconds: config.timeLimitSeconds }
          : {}),
      },
    };
  }
}

function parseDifficulty(value: string): Difficulty {
  if (value === Difficulty.EASY || value === Difficulty.MEDIUM || value === Difficulty.HARD) {
    return value;
  }
  return Difficulty.EASY;
}
