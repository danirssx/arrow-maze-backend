import type { Clock } from "../../../src/application/ports/Clock.js";
import type { IdGenerator } from "../../../src/application/ports/IdGenerator.js";
import type {
  DailyChallengeCacheRecord,
  DailyChallengeCacheRepository,
} from "../../../src/application/daily-challenge/ports/DailyChallengeCacheRepository.js";
import type {
  DailyChallengeGenerator,
  DailyChallengeGeneratorInput,
} from "../../../src/application/daily-challenge/ports/DailyChallengeGenerator.js";
import type { DailyChallengeIterationRepository } from "../../../src/application/daily-challenge/ports/DailyChallengeIterationRepository.js";
import type { IterationTaskScheduler } from "../../../src/application/daily-challenge/ports/IterationTaskScheduler.js";
import type { DailyChallengeIterationDto } from "../../../src/application/daily-challenge/DailyChallengeIterationTypes.js";
import type { DailyChallengeDto } from "../../../src/application/daily-challenge/DailyChallengeTypes.js";
import { determineDailyChallengeDifficulty } from "../../../src/application/daily-challenge/DailyChallengeGeneration.js";
import { InvalidDailyChallengeDateError } from "../../../src/application/daily-challenge/DailyChallengeIterationErrors.js";
import {
  StartDailyChallengeIterationUseCase,
  iterationSeed,
  isValidUtcDateKey,
} from "../../../src/application/daily-challenge/use-cases/StartDailyChallengeIterationUseCase.js";
import type { DailyChallengeIterationEventDto } from "../../../src/application/daily-challenge/DailyChallengeIterationTypes.js";

// Subject to human review — application use-case tests for MAZ-224 @s1..@s5, @s9..@s11.

const TODAY = "2026-07-11";
const NOW = new Date(`${TODAY}T14:00:00.000Z`);

class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `op-${this.counter}`;
  }
}

class FakeCacheRepository implements DailyChallengeCacheRepository {
  private readonly records = new Map<string, DailyChallengeCacheRecord>();
  readonly saved: DailyChallengeCacheRecord[] = [];

  seed(record: DailyChallengeCacheRecord): void {
    this.records.set(record.challenge.date, record);
  }

  async findByDate(date: string): Promise<DailyChallengeCacheRecord | null> {
    return this.records.get(date) ?? null;
  }

  async save(record: DailyChallengeCacheRecord): Promise<void> {
    this.saved.push(record);
    this.records.set(record.challenge.date, record);
  }
}

class FakeIterationRepository implements DailyChallengeIterationRepository {
  private readonly operations = new Map<string, DailyChallengeIterationDto>();
  readonly saved: DailyChallengeIterationDto[] = [];

  seed(operation: DailyChallengeIterationDto): void {
    this.operations.set(operation.operationId, operation);
  }

  async save(operation: DailyChallengeIterationDto): Promise<void> {
    this.saved.push(operation);
    this.operations.set(operation.operationId, operation);
  }

  async findById(operationId: string): Promise<DailyChallengeIterationDto | null> {
    return this.operations.get(operationId) ?? null;
  }

  async findRunningByDate(date: string): Promise<DailyChallengeIterationDto | null> {
    for (const operation of this.operations.values()) {
      if (operation.date === date && operation.status === "RUNNING") {
        return operation;
      }
    }
    return null;
  }
}

class FakeGenerator implements DailyChallengeGenerator {
  readonly calls: DailyChallengeGeneratorInput[] = [];

  constructor(
    private readonly result:
      | unknown
      | Error
      | ((input: DailyChallengeGeneratorInput) => unknown | Error)
  ) {}

  async generate(input: DailyChallengeGeneratorInput): Promise<unknown> {
    this.calls.push(input);
    if (typeof this.result === "function") {
      const value = this.result(input);
      if (value instanceof Error) {
        throw value;
      }
      return value;
    }
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}

class ManualScheduler implements IterationTaskScheduler {
  private readonly tasks: Array<() => Promise<void>> = [];

  schedule(task: () => Promise<void>): void {
    this.tasks.push(task);
  }

  get pending(): number {
    return this.tasks.length;
  }

  async runAll(): Promise<void> {
    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      await task();
    }
  }
}

function validCandidate(date = TODAY, overrides: { name?: string; seed?: string } = {}) {
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

function generatedCandidate(overrides: { name?: string } = {}) {
  return (input: DailyChallengeGeneratorInput) =>
    validCandidate(input.date, { ...overrides, seed: input.seed });
}

function existingChallenge(date = TODAY): DailyChallengeDto {
  return {
    date,
    seed: `daily-${date}`,
    targetDifficulty: determineDailyChallengeDifficulty(date),
    source: "gemini",
    generatedAt: "2026-07-11T04:00:00.000Z",
    expiresAt: "2026-07-12T00:00:00.000Z",
    validation: { solvable: true, difficultyMatched: true, fallbackUsed: false },
    level: {
      name: "Previous Daily Challenge",
      description: "Previous puzzle.",
      difficulty: determineDailyChallengeDifficulty(date),
      definition: {
        attempts: 5,
        arrows: [
          { id: "arrow-0", color: "#4B6BFB", path: [{ row: 0, col: 0 }], direction: "RIGHT" },
        ],
      },
    },
  };
}

type Harness = {
  useCase: StartDailyChallengeIterationUseCase;
  iterations: FakeIterationRepository;
  cache: FakeCacheRepository;
  scheduler: ManualScheduler;
  gemini: FakeGenerator;
  fallback: FakeGenerator;
};

function makeHarness(gemini: FakeGenerator, fallback: FakeGenerator): Harness {
  const iterations = new FakeIterationRepository();
  const cache = new FakeCacheRepository();
  const scheduler = new ManualScheduler();
  const useCase = new StartDailyChallengeIterationUseCase(
    iterations,
    cache,
    gemini,
    fallback,
    new FixedClock(NOW),
    new SequentialIdGenerator(),
    scheduler
  );
  return { useCase, iterations, cache, scheduler, gemini, fallback };
}

function eventTypes(operation: DailyChallengeIterationDto): string[] {
  return operation.events.map((event) => event.type);
}

function eventLog(operation: DailyChallengeIterationDto) {
  return operation.events.map((event: DailyChallengeIterationEventDto) => ({
    sequence: event.sequence,
    type: event.type,
    message: event.message,
    source: event.source ?? null,
    fallbackUsed: event.fallbackUsed ?? null,
  }));
}

describe("StartDailyChallengeIterationUseCase", () => {
  it("should_return_running_operation_with_requested_event_when_admin_starts_for_today", async () => {
    // @s1
    const harness = makeHarness(new FakeGenerator(generatedCandidate()), new FakeGenerator(new Error("unused")));

    const result = await harness.useCase.execute({});

    expect(result.alreadyRunning).toBe(false);
    expect(result.operation.status).toBe("RUNNING");
    expect(result.operation.date).toBe(TODAY);
    expect(eventTypes(result.operation)).toEqual(["REQUESTED"]);
    expect(result.operation.challenge).toBeNull();
  });

  it("should_store_validated_challenge_for_today_after_pipeline_runs", async () => {
    // @s1
    const harness = makeHarness(new FakeGenerator(generatedCandidate()), new FakeGenerator(new Error("unused")));

    const { operation } = await harness.useCase.execute({});
    await harness.scheduler.runAll();

    const stored = await harness.iterations.findById(operation.operationId);
    expect(stored?.status).toBe("SUCCEEDED");
    expect(stored?.challenge?.date).toBe(TODAY);
    const cached = await harness.cache.findByDate(TODAY);
    expect(cached?.challenge.source).toBe("gemini");
  });

  it("should_use_a_unique_iteration_seed_so_retries_can_replace_with_a_visible_variant", async () => {
    // @s2
    const harness = makeHarness(
      new FakeGenerator(generatedCandidate()),
      new FakeGenerator(new Error("unused"))
    );

    const first = await harness.useCase.execute({});
    await harness.scheduler.runAll();
    const second = await harness.useCase.execute({});
    await harness.scheduler.runAll();

    const firstStored = await harness.iterations.findById(first.operation.operationId);
    const secondStored = await harness.iterations.findById(second.operation.operationId);
    expect(firstStored?.challenge?.seed).toBe(iterationSeed(TODAY, "op-1"));
    expect(secondStored?.challenge?.seed).toBe(iterationSeed(TODAY, "op-2"));
    expect(firstStored?.challenge?.seed).not.toBe(secondStored?.challenge?.seed);
    expect((await harness.cache.findByDate(TODAY))?.challenge.seed).toBe(
      iterationSeed(TODAY, "op-2")
    );
  });

  it("should_replace_existing_challenge_atomically_only_after_success", async () => {
    // @s2
    const harness = makeHarness(
      new FakeGenerator(generatedCandidate({ name: "Regenerated Daily Challenge" })),
      new FakeGenerator(new Error("unused"))
    );
    harness.cache.seed({ challenge: existingChallenge() });

    const { operation } = await harness.useCase.execute({ date: TODAY });
    // Before the pipeline runs, the previous challenge is still cached.
    expect((await harness.cache.findByDate(TODAY))?.challenge.level.name).toBe(
      "Previous Daily Challenge"
    );

    await harness.scheduler.runAll();

    const stored = await harness.iterations.findById(operation.operationId);
    expect(stored?.status).toBe("SUCCEEDED");
    expect(eventTypes(stored!)).toContain("CACHE_REPLACED");
    expect((await harness.cache.findByDate(TODAY))?.challenge.level.name).toBe(
      "Regenerated Daily Challenge"
    );
  });

  it("should_log_gemini_source_without_secrets_when_generation_succeeds", async () => {
    // @s3
    const harness = makeHarness(new FakeGenerator(generatedCandidate()), new FakeGenerator(new Error("unused")));

    const { operation } = await harness.useCase.execute({});
    await harness.scheduler.runAll();
    const stored = await harness.iterations.findById(operation.operationId);

    const validation = stored!.events.find((event) => event.type === "VALIDATION_PASSED");
    expect(validation?.source).toBe("gemini");
    expect(validation?.fallbackUsed).toBe(false);
    expect(JSON.stringify(stored)).not.toContain("sk-");
  });

  it("should_fall_back_and_log_fallback_usage_when_gemini_candidate_is_invalid", async () => {
    // @s4
    const harness = makeHarness(
      new FakeGenerator(new Error("gemini exploded secret sk-should-not-leak")),
      new FakeGenerator(generatedCandidate())
    );

    const { operation } = await harness.useCase.execute({});
    await harness.scheduler.runAll();
    const stored = await harness.iterations.findById(operation.operationId);

    expect(stored?.status).toBe("SUCCEEDED");
    expect(stored?.challenge?.source).toBe("fallback");
    expect(eventTypes(stored!)).toContain("FALLBACK_USED");
    expect(JSON.stringify(stored)).not.toContain("sk-should-not-leak");
    expect((await harness.cache.findByDate(TODAY))?.challenge.source).toBe("fallback");
  });

  it("should_fail_and_preserve_previous_challenge_when_both_generators_fail", async () => {
    // @s5
    const harness = makeHarness(
      new FakeGenerator(new Error("gemini boom sk-secret")),
      new FakeGenerator(new Error("fallback boom"))
    );
    harness.cache.seed({ challenge: existingChallenge() });

    const { operation } = await harness.useCase.execute({ date: TODAY });
    await harness.scheduler.runAll();
    const stored = await harness.iterations.findById(operation.operationId);

    expect(stored?.status).toBe("FAILED");
    expect(stored?.completedAt).not.toBeNull();
    expect(eventTypes(stored!)).toContain("FAILED");
    expect(JSON.stringify(stored)).not.toContain("sk-secret");
    expect(harness.cache.saved).toHaveLength(0);
    expect((await harness.cache.findByDate(TODAY))?.challenge.level.name).toBe(
      "Previous Daily Challenge"
    );
  });

  it("should_reject_duplicate_running_iteration_for_same_date", async () => {
    // @s9
    const harness = makeHarness(new FakeGenerator(validCandidate()), new FakeGenerator(new Error("unused")));
    harness.iterations.seed({
      operationId: "op-running",
      date: TODAY,
      status: "RUNNING",
      requestedAt: NOW.toISOString(),
      completedAt: null,
      events: [{ sequence: 1, type: "REQUESTED", message: "requested", createdAt: NOW.toISOString() }],
      challenge: null,
    });

    const result = await harness.useCase.execute({ date: TODAY });

    expect(result.alreadyRunning).toBe(true);
    expect(result.operation.operationId).toBe("op-running");
    expect(harness.scheduler.pending).toBe(0);
    expect(harness.gemini.calls).toHaveLength(0);
  });

  it("should_reject_malformed_date_with_format_message_before_calling_any_generator", async () => {
    // @s10 — a malformed key is rejected as invalid format, not as a future date
    const harness = makeHarness(new FakeGenerator(validCandidate()), new FakeGenerator(validCandidate()));

    await expect(harness.useCase.execute({ date: "not-a-date" })).rejects.toMatchObject({
      code: "INVALID_DAILY_CHALLENGE_DATE",
      message: "Daily challenge date must be a valid UTC date in YYYY-MM-DD format",
    });
    await expect(harness.useCase.execute({ date: "not-a-date" })).rejects.toBeInstanceOf(
      InvalidDailyChallengeDateError
    );
    expect(harness.iterations.saved).toHaveLength(0);
    expect(harness.gemini.calls).toHaveLength(0);
    expect(harness.fallback.calls).toHaveLength(0);
  });

  it("should_reject_calendar_invalid_date_with_format_message", async () => {
    // @s10 — well-formed pattern but impossible calendar date (month 13)
    const harness = makeHarness(new FakeGenerator(validCandidate()), new FakeGenerator(validCandidate()));

    await expect(harness.useCase.execute({ date: "2026-13-01" })).rejects.toMatchObject({
      message: "Daily challenge date must be a valid UTC date in YYYY-MM-DD format",
    });
    expect(harness.gemini.calls).toHaveLength(0);
  });

  it("should_reject_future_date_with_future_message_before_calling_any_generator", async () => {
    // @s11
    const harness = makeHarness(new FakeGenerator(validCandidate()), new FakeGenerator(validCandidate()));

    await expect(harness.useCase.execute({ date: "2999-01-01" })).rejects.toMatchObject({
      code: "INVALID_DAILY_CHALLENGE_DATE",
      message: "Daily challenge date cannot be in the future",
    });
    expect(harness.iterations.saved).toHaveLength(0);
    expect(harness.gemini.calls).toHaveLength(0);
  });

  it("should_accept_today_and_reject_the_next_utc_day_at_the_boundary", async () => {
    // @s1/@s11 boundary — today passes, tomorrow is future
    const ok = makeHarness(new FakeGenerator(generatedCandidate()), new FakeGenerator(new Error("unused")));
    const result = await ok.useCase.execute({ date: TODAY });
    expect(result.operation.date).toBe(TODAY);

    const future = makeHarness(new FakeGenerator(generatedCandidate()), new FakeGenerator(new Error("unused")));
    await expect(future.useCase.execute({ date: "2026-07-12" })).rejects.toMatchObject({
      message: "Daily challenge date cannot be in the future",
    });
  });
});

describe("StartDailyChallengeIterationUseCase operation event log", () => {
  it("should_record_the_exact_ordered_event_log_when_gemini_succeeds", async () => {
    // @s3
    const harness = makeHarness(new FakeGenerator(generatedCandidate()), new FakeGenerator(new Error("unused")));

    const { operation } = await harness.useCase.execute({});
    await harness.scheduler.runAll();
    const stored = await harness.iterations.findById(operation.operationId);

    expect(eventLog(stored!)).toEqual([
      { sequence: 1, type: "REQUESTED", message: "Daily challenge iteration requested", source: null, fallbackUsed: null },
      { sequence: 2, type: "GENERATION_STARTED", message: "Daily challenge generation started", source: null, fallbackUsed: null },
      { sequence: 3, type: "GENERATOR_SELECTED", message: "gemini generation selected", source: "gemini", fallbackUsed: null },
      { sequence: 4, type: "VALIDATION_PASSED", message: "Generated challenge passed validation", source: "gemini", fallbackUsed: false },
      { sequence: 5, type: "CACHE_REPLACED", message: "Daily challenge cache replaced", source: null, fallbackUsed: null },
    ]);
  });

  it("should_record_the_exact_ordered_event_log_when_gemini_fails_and_fallback_succeeds", async () => {
    // @s4
    const harness = makeHarness(
      new FakeGenerator(new Error("gemini invalid")),
      new FakeGenerator(generatedCandidate())
    );

    const { operation } = await harness.useCase.execute({});
    await harness.scheduler.runAll();
    const stored = await harness.iterations.findById(operation.operationId);

    expect(eventLog(stored!)).toEqual([
      { sequence: 1, type: "REQUESTED", message: "Daily challenge iteration requested", source: null, fallbackUsed: null },
      { sequence: 2, type: "GENERATION_STARTED", message: "Daily challenge generation started", source: null, fallbackUsed: null },
      { sequence: 3, type: "GENERATOR_SELECTED", message: "gemini generation selected", source: "gemini", fallbackUsed: null },
      { sequence: 4, type: "CANDIDATE_REJECTED", message: "gemini candidate rejected", source: "gemini", fallbackUsed: null },
      { sequence: 5, type: "FALLBACK_USED", message: "Falling back to deterministic generator", source: "fallback", fallbackUsed: true },
      { sequence: 6, type: "GENERATOR_SELECTED", message: "fallback generation selected", source: "fallback", fallbackUsed: null },
      { sequence: 7, type: "VALIDATION_PASSED", message: "Generated challenge passed validation", source: "fallback", fallbackUsed: true },
      { sequence: 8, type: "CACHE_REPLACED", message: "Daily challenge cache replaced", source: null, fallbackUsed: null },
    ]);
  });

  it("should_record_the_exact_ordered_event_log_when_both_generators_fail", async () => {
    // @s5
    const harness = makeHarness(
      new FakeGenerator(new Error("gemini invalid")),
      new FakeGenerator(new Error("fallback invalid"))
    );

    const { operation } = await harness.useCase.execute({});
    await harness.scheduler.runAll();
    const stored = await harness.iterations.findById(operation.operationId);

    expect(eventLog(stored!)).toEqual([
      { sequence: 1, type: "REQUESTED", message: "Daily challenge iteration requested", source: null, fallbackUsed: null },
      { sequence: 2, type: "GENERATION_STARTED", message: "Daily challenge generation started", source: null, fallbackUsed: null },
      { sequence: 3, type: "GENERATOR_SELECTED", message: "gemini generation selected", source: "gemini", fallbackUsed: null },
      { sequence: 4, type: "CANDIDATE_REJECTED", message: "gemini candidate rejected", source: "gemini", fallbackUsed: null },
      { sequence: 5, type: "FALLBACK_USED", message: "Falling back to deterministic generator", source: "fallback", fallbackUsed: true },
      { sequence: 6, type: "GENERATOR_SELECTED", message: "fallback generation selected", source: "fallback", fallbackUsed: null },
      { sequence: 7, type: "CANDIDATE_REJECTED", message: "fallback candidate rejected", source: "fallback", fallbackUsed: null },
      { sequence: 8, type: "FAILED", message: "Daily challenge iteration failed to produce a valid challenge", source: null, fallbackUsed: null },
    ]);
    expect(stored?.completedAt).not.toBeNull();
  });
});

describe("isValidUtcDateKey", () => {
  it("should_accept_a_well_formed_calendar_date", () => {
    expect(isValidUtcDateKey("2026-07-11")).toBe(true);
    expect(isValidUtcDateKey("2024-02-29")).toBe(true);
  });

  it("should_reject_malformed_or_impossible_dates", () => {
    expect(isValidUtcDateKey("not-a-date")).toBe(false);
    expect(isValidUtcDateKey("2026-7-1")).toBe(false);
    expect(isValidUtcDateKey("2026-13-01")).toBe(false);
    expect(isValidUtcDateKey("2026-00-10")).toBe(false);
    expect(isValidUtcDateKey("2026-02-30")).toBe(false);
    expect(isValidUtcDateKey("2025-02-29")).toBe(false);
  });
});
