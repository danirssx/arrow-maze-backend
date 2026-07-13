import type { Clock } from "../../../src/application/ports/Clock.js";
import type {
  DailyChallengeCacheRecord,
  DailyChallengeCacheRepository,
} from "../../../src/application/daily-challenge/ports/DailyChallengeCacheRepository.js";
import type {
  DailyChallengeGenerator,
  DailyChallengeGeneratorInput,
} from "../../../src/application/daily-challenge/ports/DailyChallengeGenerator.js";
import type { DailyChallengeDto } from "../../../src/application/daily-challenge/DailyChallengeTypes.js";
import {
  GetDailyChallengeUseCase,
  determineDailyChallengeDifficulty,
  nextUtcMidnightIso,
  utcDateKey,
} from "../../../src/application/daily-challenge/use-cases/GetDailyChallengeUseCase.js";

// Subject to human review — application use-case tests for MAZ-218 @s2..@s7, @s9.

class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

class FakeCacheRepository implements DailyChallengeCacheRepository {
  private readonly records = new Map<string, DailyChallengeCacheRecord>();
  readonly saved: DailyChallengeCacheRecord[] = [];

  seed(record: DailyChallengeCacheRecord): void {
    this.records.set(record.challenge.date, record);
  }

  seedLookup(date: string, record: DailyChallengeCacheRecord): void {
    this.records.set(date, record);
  }

  async findByDate(date: string): Promise<DailyChallengeCacheRecord | null> {
    return this.records.get(date) ?? null;
  }

  async save(record: DailyChallengeCacheRecord): Promise<void> {
    this.saved.push(record);
    this.records.set(record.challenge.date, record);
  }
}

class FakeGenerator implements DailyChallengeGenerator {
  calls: DailyChallengeGeneratorInput[] = [];

  constructor(private readonly result: unknown | Error) {}

  async generate(input: DailyChallengeGeneratorInput): Promise<unknown> {
    this.calls.push(input);
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}

function validCandidate(date = "2026-07-10", overrides: { seed?: string; name?: string } = {}) {
  const targetDifficulty = determineDailyChallengeDifficulty(date);
  return {
    date,
    seed: overrides.seed ?? `daily-${date}`,
    targetDifficulty,
    level: {
      name: overrides.name ?? `Daily Challenge ${date}`,
      description: "A generated daily puzzle.",
      difficulty: targetDifficulty,
      definition: {
        attempts: 5,
        arrows: [
          {
            id: "arrow-0",
            color: "#4B6BFB",
            path: [{ row: 0, col: 0 }],
            direction: "RIGHT",
          },
        ],
        boardShape: {
          type: "CELL_MASK",
          cells: [{ row: 0, col: 0 }],
        },
      },
      timeLimitSeconds: 120,
    },
  };
}

function boardSizeCandidate(date = "2026-07-10") {
  const candidate = validCandidate(date);
  return {
    ...candidate,
    level: {
      ...candidate.level,
      definition: {
        ...candidate.level.definition,
        boardShape: undefined,
        boardSize: { rows: 2, cols: 2 },
      },
    },
  };
}

function unsolvableCandidate(date = "2026-07-10") {
  const targetDifficulty = determineDailyChallengeDifficulty(date);
  return {
    ...validCandidate(date),
    targetDifficulty,
    level: {
      ...validCandidate(date).level,
      difficulty: targetDifficulty,
      definition: {
        attempts: 5,
        arrows: [
          {
            id: "arrow-0",
            color: "#4B6BFB",
            path: [{ row: 0, col: 0 }],
            direction: "RIGHT",
          },
          {
            id: "arrow-1",
            color: "#3FD06A",
            path: [{ row: 0, col: 1 }],
            direction: "LEFT",
          },
        ],
        boardShape: {
          type: "CELL_MASK",
          cells: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
        },
      },
    },
  };
}

function useCaseFor(options: {
  now?: string;
  cache?: FakeCacheRepository;
  gemini?: DailyChallengeGenerator;
  fallback?: DailyChallengeGenerator;
}) {
  const cache = options.cache ?? new FakeCacheRepository();
  const gemini = options.gemini ?? new FakeGenerator(validCandidate());
  const fallback = options.fallback ?? new FakeGenerator(validCandidate());
  const clock = new FixedClock(new Date(options.now ?? "2026-07-10T04:00:00.000Z"));
  return {
    cache,
    gemini,
    fallback,
    useCase: new GetDailyChallengeUseCase(cache, gemini, fallback, clock),
  };
}

describe("GetDailyChallengeUseCase", () => {
  it("should_format_utc_date_key_when_clock_has_local_timezone_offset", () => {
    // Arrange
    const now = new Date("2026-07-10T23:30:00.000-04:00");

    // Act / Assert
    expect(utcDateKey(now)).toBe("2026-07-11");
    expect(nextUtcMidnightIso("2026-07-11")).toBe("2026-07-12T00:00:00.000Z");
    expect(nextUtcMidnightIso("1970-01-01")).toBe("1970-01-02T00:00:00.000Z");
    expect(() => nextUtcMidnightIso("2026-07")).toThrow("Invalid UTC date key");
    expect(determineDailyChallengeDifficulty("1970-01-01")).toBe("EASY");
    expect(determineDailyChallengeDifficulty("1970-01-02")).toBe("MEDIUM");
    expect(determineDailyChallengeDifficulty("1970-01-03")).toBe("HARD");
    expect(determineDailyChallengeDifficulty("2026-07-10")).toBe("MEDIUM");
  });

  it("should_generate_validate_cache_and_return_gemini_challenge_when_cache_misses", async () => {
    // Arrange
    const { useCase, cache, gemini } = useCaseFor({ gemini: new FakeGenerator(validCandidate()) });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.date).toBe("2026-07-10");
    expect(result.challenge.seed).toBe("daily-2026-07-10");
    expect(result.challenge.source).toBe("gemini");
    expect(result.challenge.generatedAt).toBe("2026-07-10T04:00:00.000Z");
    expect(result.challenge.expiresAt).toBe("2026-07-11T00:00:00.000Z");
    expect(result.challenge.validation).toEqual({
      solvable: true,
      difficultyMatched: true,
      fallbackUsed: false,
    });
    expect(result.challenge.level).toEqual({
      name: "Daily Challenge 2026-07-10",
      description: "A generated daily puzzle.",
      difficulty: "MEDIUM",
      definition: {
        attempts: 5,
        arrows: [
          {
            id: "arrow-0",
            color: "#4B6BFB",
            path: [{ row: 0, col: 0, z: 0 }],
            direction: "RIGHT",
          },
        ],
        boardShape: {
          type: "CELL_MASK",
          cells: [{ row: 0, col: 0, z: 0 }],
        },
      },
      timeLimitSeconds: 120,
    });
    expect(cache.saved).toHaveLength(1);
    expect(gemini.calls).toHaveLength(1);
    expect(gemini.calls[0]).toEqual({
      date: "2026-07-10",
      seed: "daily-2026-07-10",
      targetDifficulty: "MEDIUM",
      expiresAt: "2026-07-11T00:00:00.000Z",
    });
  });

  it("should_return_cached_challenge_without_calling_gemini_when_cache_hit_is_current", async () => {
    // Arrange
    const cache = new FakeCacheRepository();
    const cached = (await useCaseFor({}).useCase.execute({})).challenge;
    cache.seed({ challenge: cached });
    const gemini = new FakeGenerator(new Error("should not call provider"));
    const { useCase } = useCaseFor({ cache, gemini });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge).toEqual(cached);
    expect(gemini.calls).toHaveLength(0);
  });

  it("should_return_manually_iterated_cached_challenge_even_when_seed_differs_from_daily_seed", async () => {
    // Arrange
    const cache = new FakeCacheRepository();
    const manualChallenge = {
      ...(await useCaseFor({}).useCase.execute({})).challenge,
      seed: "daily-2026-07-10-i-op-1",
      level: {
        ...(await useCaseFor({}).useCase.execute({})).challenge.level,
        name: "Regenerated Daily Challenge",
      },
    };
    cache.seed({ challenge: manualChallenge });
    const gemini = new FakeGenerator(new Error("should not call provider"));
    const { useCase } = useCaseFor({ cache, gemini });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.seed).toBe("daily-2026-07-10-i-op-1");
    expect(result.challenge.level.name).toBe("Regenerated Daily Challenge");
    expect(gemini.calls).toHaveLength(0);
  });

  it.each([
    [
      "date",
      (cached: DailyChallengeDto): DailyChallengeDto => ({
        ...cached,
        date: "2026-07-09",
      }),
    ],
    [
      "expiry",
      (cached: DailyChallengeDto): DailyChallengeDto => ({
        ...cached,
        expiresAt: "2026-07-10T04:00:00.000Z",
      }),
    ],
  ])("should_regenerate_challenge_when_cached_%s_is_not_current", async (_field, mutateCached) => {
    // Arrange
    const cache = new FakeCacheRepository();
    const cached = (await useCaseFor({}).useCase.execute({})).challenge;
    cache.seedLookup("2026-07-10", { challenge: mutateCached(cached) });
    const gemini = new FakeGenerator(validCandidate());
    const { useCase } = useCaseFor({ cache, gemini });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.date).toBe("2026-07-10");
    expect(result.challenge.seed).toBe("daily-2026-07-10");
    expect(result.challenge.source).toBe("gemini");
    expect(gemini.calls).toHaveLength(1);
    expect(cache.saved).toHaveLength(1);
  });

  it("should_reject_invalid_gemini_payload_and_cache_validated_fallback", async () => {
    // Arrange
    const gemini = new FakeGenerator({ not: "a daily challenge" });
    const fallback = new FakeGenerator(validCandidate());
    const { useCase, cache } = useCaseFor({ gemini, fallback });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.source).toBe("fallback");
    expect(result.challenge.validation.fallbackUsed).toBe(true);
    expect(JSON.stringify(result)).not.toContain("not");
    expect(cache.saved[0]?.challenge.source).toBe("fallback");
  });

  it.each([
    ["primitive_candidate", null],
    ["wrong_date", { ...validCandidate(), date: "2026-07-09" }],
    ["wrong_seed", { ...validCandidate(), seed: "daily-2026-07-09" }],
    ["wrong_target_difficulty", { ...validCandidate(), targetDifficulty: "HARD" }],
    ["missing_level", { ...validCandidate(), level: undefined }],
    [
      "missing_definition",
      {
        ...validCandidate(),
        level: { ...validCandidate().level, definition: undefined },
      },
    ],
    [
      "non_array_arrows",
      {
        ...validCandidate(),
        level: {
          ...validCandidate().level,
          definition: { ...validCandidate().level.definition, arrows: "arrow" },
        },
      },
    ],
  ])("should_reject_%s_from_gemini_and_return_validated_fallback", async (_caseName, invalidCandidate) => {
    // Arrange
    const { useCase } = useCaseFor({
      gemini: new FakeGenerator(invalidCandidate),
      fallback: new FakeGenerator(validCandidate()),
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.source).toBe("fallback");
    expect(result.challenge.validation.fallbackUsed).toBe(true);
  });

  it("should_reject_level_difficulty_that_does_not_match_target_difficulty", async () => {
    // Arrange
    const candidate = validCandidate();
    const { useCase } = useCaseFor({
      gemini: new FakeGenerator({
        ...candidate,
        level: {
          ...candidate.level,
          difficulty: "HARD",
        },
      }),
      fallback: new FakeGenerator(validCandidate()),
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.source).toBe("fallback");
    expect(result.challenge.targetDifficulty).toBe("MEDIUM");
    expect(result.challenge.level.difficulty).toBe("MEDIUM");
  });

  it("should_reject_unsolvable_gemini_candidate_and_return_validated_fallback", async () => {
    // Arrange
    const { useCase } = useCaseFor({
      gemini: new FakeGenerator(unsolvableCandidate()),
      fallback: new FakeGenerator(validCandidate()),
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.source).toBe("fallback");
    expect(result.challenge.validation.solvable).toBe(true);
  });

  it.each([
    [
      "combined_board_size_and_shape",
      {
        ...validCandidate(),
        level: {
          ...validCandidate().level,
          definition: {
            ...validCandidate().level.definition,
            boardSize: { rows: 2, cols: 2 },
          },
        },
      },
    ],
    [
      "missing_arrow_direction",
      {
        ...validCandidate(),
        level: {
          ...validCandidate().level,
          definition: {
            ...validCandidate().level.definition,
            arrows: [
              {
                id: "arrow-0",
                color: "#4B6BFB",
                path: [{ row: 0, col: 0 }],
              },
            ],
          },
        },
      },
    ],
  ])("should_reject_%s_from_gemini_and_use_fallback", async (_caseName, invalidCandidate) => {
    // Arrange
    const { useCase } = useCaseFor({
      gemini: new FakeGenerator(invalidCandidate),
      fallback: new FakeGenerator(validCandidate()),
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.source).toBe("fallback");
    expect(result.challenge.level.definition.boardShape).toEqual({
      type: "CELL_MASK",
      cells: [{ row: 0, col: 0, z: 0 }],
    });
  });

  it("should_accept_board_size_candidate_and_return_cell_mask_board_shape", async () => {
    // Arrange
    const { useCase } = useCaseFor({ gemini: new FakeGenerator(boardSizeCandidate()) });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.source).toBe("gemini");
    expect(result.challenge.level.definition.boardShape).toEqual({
      type: "CELL_MASK",
      cells: [
        { row: 0, col: 0, z: 0 },
        { row: 0, col: 1, z: 0 },
        { row: 1, col: 0, z: 0 },
        { row: 1, col: 1, z: 0 },
      ],
    });
  });

  it("should_omit_time_limit_when_valid_candidate_does_not_define_it", async () => {
    // Arrange
    const candidate = validCandidate();
    const { useCase } = useCaseFor({
      gemini: new FakeGenerator({
        ...candidate,
        level: {
          ...candidate.level,
          timeLimitSeconds: undefined,
        },
      }),
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.source).toBe("gemini");
    expect(result.challenge.level.timeLimitSeconds).toBeUndefined();
  });

  it("should_reject_wrong_date_seed_or_difficulty_and_return_validated_fallback", async () => {
    // Arrange
    const wrong = validCandidate("2026-07-11");
    const { useCase } = useCaseFor({
      gemini: new FakeGenerator(wrong),
      fallback: new FakeGenerator(validCandidate("2026-07-10")),
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.date).toBe("2026-07-10");
    expect(result.challenge.seed).toBe("daily-2026-07-10");
    expect(result.challenge.source).toBe("fallback");
  });

  it("should_use_next_utc_date_seed_expiry_and_cache_key_when_day_rolls_over", async () => {
    // Arrange
    const { useCase, cache } = useCaseFor({
      now: "2026-07-11T00:00:00.000Z",
      gemini: new FakeGenerator(validCandidate("2026-07-11")),
      fallback: new FakeGenerator(validCandidate("2026-07-11")),
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.challenge.date).toBe("2026-07-11");
    expect(result.challenge.seed).toBe("daily-2026-07-11");
    expect(result.challenge.expiresAt).toBe("2026-07-12T00:00:00.000Z");
    expect(cache.saved[0]?.challenge.date).toBe("2026-07-11");
  });

  it("should_throw_sanitized_service_error_when_gemini_and_fallback_are_invalid", async () => {
    // Arrange
    const { useCase } = useCaseFor({
      gemini: new FakeGenerator(new Error("GEMINI_API_KEY secret provider failure")),
      fallback: new FakeGenerator({ invalid: true }),
    });

    // Act / Assert
    await expect(useCase.execute({})).rejects.toMatchObject({
      code: "DAILY_CHALLENGE_UNAVAILABLE",
      httpStatus: 503,
      message: "Daily challenge unavailable",
    });
  });
});
