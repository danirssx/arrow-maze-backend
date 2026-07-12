import { ServiceUnavailableError } from "../../../shared/errors/ApplicationError.js";
import type { UseCase } from "../../aspects/UseCase.js";
import type { Clock } from "../../ports/Clock.js";
import {
  buildChallengeContext,
  validateDailyChallengeCandidate,
  type ChallengeContext,
} from "../DailyChallengeGeneration.js";
import type { DailyChallengeCacheRepository } from "../ports/DailyChallengeCacheRepository.js";
import type { DailyChallengeGenerator } from "../ports/DailyChallengeGenerator.js";
import type {
  DailyChallengeDto,
  DailyChallengeSource,
} from "../DailyChallengeTypes.js";

export type GetDailyChallengeInput = Record<string, never>;
export type GetDailyChallengeOutput = { readonly challenge: DailyChallengeDto };

export type { DailyChallengeDto, DailyChallengeSource } from "../DailyChallengeTypes.js";
export {
  determineDailyChallengeDifficulty,
  nextUtcMidnightIso,
  utcDateKey,
} from "../DailyChallengeGeneration.js";

export class GetDailyChallengeUseCase
  implements UseCase<GetDailyChallengeInput, GetDailyChallengeOutput>
{
  constructor(
    private readonly cache: DailyChallengeCacheRepository,
    private readonly geminiGenerator: DailyChallengeGenerator,
    private readonly fallbackGenerator: DailyChallengeGenerator,
    private readonly clock: Clock
  ) {}

  async execute(_input: GetDailyChallengeInput): Promise<GetDailyChallengeOutput> {
    const context = buildChallengeContext(this.clock.now());
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
      return validateDailyChallengeCandidate(raw, context, source);
    } catch {
      return null;
    }
  }
}
