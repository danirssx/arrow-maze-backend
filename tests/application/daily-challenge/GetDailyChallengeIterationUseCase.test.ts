import type { DailyChallengeIterationRepository } from "../../../src/application/daily-challenge/ports/DailyChallengeIterationRepository.js";
import type { DailyChallengeIterationDto } from "../../../src/application/daily-challenge/DailyChallengeIterationTypes.js";
import { DailyChallengeIterationNotFoundError } from "../../../src/application/daily-challenge/DailyChallengeIterationErrors.js";
import { GetDailyChallengeIterationUseCase } from "../../../src/application/daily-challenge/use-cases/GetDailyChallengeIterationUseCase.js";

// Subject to human review — application use-case tests for MAZ-224 @s8.

class FakeIterationRepository implements DailyChallengeIterationRepository {
  private readonly operations = new Map<string, DailyChallengeIterationDto>();

  seed(operation: DailyChallengeIterationDto): void {
    this.operations.set(operation.operationId, operation);
  }

  async save(operation: DailyChallengeIterationDto): Promise<void> {
    this.operations.set(operation.operationId, operation);
  }

  async findById(operationId: string): Promise<DailyChallengeIterationDto | null> {
    return this.operations.get(operationId) ?? null;
  }

  async findRunningByDate(): Promise<DailyChallengeIterationDto | null> {
    return null;
  }
}

function operation(): DailyChallengeIterationDto {
  return {
    operationId: "op-1",
    date: "2026-07-11",
    status: "SUCCEEDED",
    requestedAt: "2026-07-11T14:00:00.000Z",
    completedAt: "2026-07-11T14:00:04.000Z",
    events: [
      { sequence: 1, type: "REQUESTED", message: "requested", createdAt: "2026-07-11T14:00:00.000Z" },
      { sequence: 2, type: "CACHE_REPLACED", message: "replaced", createdAt: "2026-07-11T14:00:04.000Z" },
    ],
    challenge: null,
  };
}

describe("GetDailyChallengeIterationUseCase", () => {
  it("should_return_ordered_operation_events_when_operation_exists", async () => {
    // @s8
    const repository = new FakeIterationRepository();
    repository.seed(operation());
    const useCase = new GetDailyChallengeIterationUseCase(repository);

    const result = await useCase.execute({ operationId: "op-1" });

    expect(result.operation.operationId).toBe("op-1");
    expect(result.operation.events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(result.operation.completedAt).toBe("2026-07-11T14:00:04.000Z");
  });

  it("should_raise_not_found_with_sanitized_message_when_operation_is_unknown", async () => {
    // @s8
    const useCase = new GetDailyChallengeIterationUseCase(new FakeIterationRepository());

    await expect(useCase.execute({ operationId: "missing" })).rejects.toMatchObject({
      code: "DAILY_CHALLENGE_ITERATION_NOT_FOUND",
      message: "Daily challenge iteration not found",
    });
    await expect(useCase.execute({ operationId: "missing" })).rejects.toBeInstanceOf(
      DailyChallengeIterationNotFoundError
    );
  });
});
