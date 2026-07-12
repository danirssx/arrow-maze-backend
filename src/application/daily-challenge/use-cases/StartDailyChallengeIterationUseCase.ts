import type { UseCase } from "../../aspects/UseCase.js";
import type { Clock } from "../../ports/Clock.js";
import type { IdGenerator } from "../../ports/IdGenerator.js";
import {
  buildChallengeContext,
  utcDateKey,
  validateDailyChallengeCandidate,
  type ChallengeContext,
} from "../DailyChallengeGeneration.js";
import { InvalidDailyChallengeDateError } from "../DailyChallengeIterationErrors.js";
import type {
  DailyChallengeIterationDto,
  DailyChallengeIterationEventDto,
  DailyChallengeIterationEventType,
  DailyChallengeIterationStatus,
} from "../DailyChallengeIterationTypes.js";
import type {
  DailyChallengeDto,
  DailyChallengeSource,
} from "../DailyChallengeTypes.js";
import type { DailyChallengeCacheRepository } from "../ports/DailyChallengeCacheRepository.js";
import type { DailyChallengeGenerator } from "../ports/DailyChallengeGenerator.js";
import type { DailyChallengeIterationRepository } from "../ports/DailyChallengeIterationRepository.js";
import type { IterationTaskScheduler } from "../ports/IterationTaskScheduler.js";

export type StartDailyChallengeIterationInput = { readonly date?: string };
export type StartDailyChallengeIterationOutput = {
  readonly operation: DailyChallengeIterationDto;
  readonly alreadyRunning: boolean;
};

type EventMetadata = {
  readonly source?: DailyChallengeSource;
  readonly fallbackUsed?: boolean;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Admin manual daily-challenge iteration command (MAZ-224).
 *
 * It validates the target UTC date, rejects concurrent operations for the same
 * date, persists a RUNNING operation with a REQUESTED event, and hands the
 * Gemini/fallback generation pipeline to an injected scheduler so the HTTP
 * response returns the RUNNING snapshot while the admin dashboard polls the
 * sanitized operation log. The previous cached challenge is only replaced after
 * a new candidate fully validates.
 */
export class StartDailyChallengeIterationUseCase
  implements
    UseCase<StartDailyChallengeIterationInput, StartDailyChallengeIterationOutput>
{
  constructor(
    private readonly iterations: DailyChallengeIterationRepository,
    private readonly cache: DailyChallengeCacheRepository,
    private readonly geminiGenerator: DailyChallengeGenerator,
    private readonly fallbackGenerator: DailyChallengeGenerator,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly scheduler: IterationTaskScheduler
  ) {}

  async execute(
    input: StartDailyChallengeIterationInput
  ): Promise<StartDailyChallengeIterationOutput> {
    const now = this.clock.now();
    const date = this.resolveDate(input.date, now);

    const running = await this.iterations.findRunningByDate(date);
    if (running !== null) {
      return { operation: running, alreadyRunning: true };
    }

    const context = buildChallengeContext(now, date);
    const requestedAt = now.toISOString();
    const startedOperation: DailyChallengeIterationDto = {
      operationId: this.idGenerator.generate(),
      date,
      status: "RUNNING",
      requestedAt,
      completedAt: null,
      events: [
        {
          sequence: 1,
          type: "REQUESTED",
          message: "Daily challenge iteration requested",
          createdAt: requestedAt,
        },
      ],
      challenge: null,
    };
    await this.iterations.save(startedOperation);

    this.scheduler.schedule(() => this.runPipeline(startedOperation, context));

    return { operation: startedOperation, alreadyRunning: false };
  }

  private resolveDate(rawDate: string | undefined, now: Date): string {
    const today = utcDateKey(now);
    if (rawDate === undefined) return today;
    if (!isValidUtcDateKey(rawDate)) {
      throw new InvalidDailyChallengeDateError(
        "Daily challenge date must be a valid UTC date in YYYY-MM-DD format"
      );
    }
    if (rawDate > today) {
      throw new InvalidDailyChallengeDateError(
        "Daily challenge date cannot be in the future"
      );
    }
    return rawDate;
  }

  private async runPipeline(
    operation: DailyChallengeIterationDto,
    context: ChallengeContext
  ): Promise<void> {
    const events: DailyChallengeIterationEventDto[] = [...operation.events];
    const append = (
      type: DailyChallengeIterationEventType,
      message: string,
      metadata?: EventMetadata
    ): void => {
      events.push({
        sequence: events.length + 1,
        type,
        message,
        createdAt: this.clock.now().toISOString(),
        ...(metadata ?? {}),
      });
    };

    append("GENERATION_STARTED", "Daily challenge generation started");

    let challenge = await this.tryGenerate(this.geminiGenerator, context, "gemini", append);
    if (challenge === null) {
      append("FALLBACK_USED", "Falling back to deterministic generator", {
        source: "fallback",
        fallbackUsed: true,
      });
      challenge = await this.tryGenerate(this.fallbackGenerator, context, "fallback", append);
    }

    if (challenge === null) {
      append("FAILED", "Daily challenge iteration failed to produce a valid challenge");
      await this.persistTerminal(operation, "FAILED", events, null);
      return;
    }

    append("VALIDATION_PASSED", "Generated challenge passed validation", {
      source: challenge.source,
      fallbackUsed: challenge.validation.fallbackUsed,
    });
    await this.cache.save({ challenge });
    append("CACHE_REPLACED", "Daily challenge cache replaced");
    await this.persistTerminal(operation, "SUCCEEDED", events, challenge);
  }

  private async tryGenerate(
    generator: DailyChallengeGenerator,
    context: ChallengeContext,
    source: DailyChallengeSource,
    append: (
      type: DailyChallengeIterationEventType,
      message: string,
      metadata?: EventMetadata
    ) => void
  ): Promise<DailyChallengeDto | null> {
    append("GENERATOR_SELECTED", `${source} generation selected`, { source });
    try {
      const raw = await generator.generate({
        date: context.date,
        seed: context.seed,
        targetDifficulty: context.targetDifficulty,
        expiresAt: context.expiresAt,
      });
      return validateDailyChallengeCandidate(raw, context, source);
    } catch {
      append("CANDIDATE_REJECTED", `${source} candidate rejected`, { source });
      return null;
    }
  }

  private async persistTerminal(
    operation: DailyChallengeIterationDto,
    status: DailyChallengeIterationStatus,
    events: readonly DailyChallengeIterationEventDto[],
    challenge: DailyChallengeDto | null
  ): Promise<void> {
    await this.iterations.save({
      ...operation,
      status,
      completedAt: this.clock.now().toISOString(),
      events,
      challenge,
    });
  }
}

export function isValidUtcDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
