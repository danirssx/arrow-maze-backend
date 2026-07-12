import { jest } from "@jest/globals";
import type { PrismaClient } from "@prisma/client";
import { PrismaDailyChallengeIterationRepository } from "../../../src/infrastructure/daily-challenge/PrismaDailyChallengeIterationRepository.js";
import type { DailyChallengeIterationDto } from "../../../src/application/daily-challenge/DailyChallengeIterationTypes.js";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError.js";

// Subject to human review — infrastructure adapter test for MAZ-224 iteration store.

type IterationDelegate = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  upsert: jest.Mock;
};

function makePrisma(overrides: Partial<IterationDelegate> = {}) {
  const dailyChallengeIteration: IterationDelegate = {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return {
    prisma: { dailyChallengeIteration } as unknown as PrismaClient,
    dailyChallengeIteration,
  };
}

function runningOperation(overrides: Partial<DailyChallengeIterationDto> = {}): DailyChallengeIterationDto {
  return {
    operationId: "f39dd177-bde0-4fd8-84cb-8cd353ffc224",
    date: "2026-07-11",
    status: "RUNNING",
    requestedAt: "2026-07-11T14:00:00.000Z",
    completedAt: null,
    events: [
      { sequence: 1, type: "REQUESTED", message: "requested", createdAt: "2026-07-11T14:00:00.000Z" },
    ],
    challenge: null,
    ...overrides,
  };
}

function makeRecord(operation = runningOperation()) {
  return {
    operationId: operation.operationId,
    date: operation.date,
    status: operation.status,
    requestedAt: new Date(operation.requestedAt),
    completedAt: operation.completedAt === null ? null : new Date(operation.completedAt),
    events: operation.events,
    challenge: operation.challenge,
    createdAt: new Date("2026-07-11T14:00:00.000Z"),
    updatedAt: new Date("2026-07-11T14:00:00.000Z"),
  };
}

describe("PrismaDailyChallengeIterationRepository", () => {
  it("should_return_operation_with_ordered_events_when_record_exists", async () => {
    const operation = runningOperation();
    const { prisma } = makePrisma({ findUnique: jest.fn().mockResolvedValue(makeRecord(operation)) });
    const repo = new PrismaDailyChallengeIterationRepository(prisma);

    const result = await repo.findById(operation.operationId);

    expect(result).toEqual(operation);
  });

  it("should_return_null_when_operation_is_unknown", async () => {
    const { prisma } = makePrisma();
    const repo = new PrismaDailyChallengeIterationRepository(prisma);

    await expect(repo.findById("missing")).resolves.toBeNull();
  });

  it("should_query_running_operation_by_date_and_status", async () => {
    const { prisma, dailyChallengeIteration } = makePrisma();
    const repo = new PrismaDailyChallengeIterationRepository(prisma);

    await repo.findRunningByDate("2026-07-11");

    expect(dailyChallengeIteration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { date: "2026-07-11", status: "RUNNING" } })
    );
  });

  it("should_upsert_terminal_operation_by_operation_id", async () => {
    const succeeded = runningOperation({
      status: "SUCCEEDED",
      completedAt: "2026-07-11T14:00:04.000Z",
    });
    const { prisma, dailyChallengeIteration } = makePrisma();
    const repo = new PrismaDailyChallengeIterationRepository(prisma);

    await repo.save(succeeded);

    expect(dailyChallengeIteration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { operationId: succeeded.operationId },
        create: expect.objectContaining({
          operationId: succeeded.operationId,
          status: "SUCCEEDED",
          completedAt: new Date("2026-07-11T14:00:04.000Z"),
        }),
      })
    );
  });

  it("should_throw_infrastructure_error_when_read_fails", async () => {
    const { prisma } = makePrisma({ findUnique: jest.fn().mockRejectedValue(new Error("db down")) });
    const repo = new PrismaDailyChallengeIterationRepository(prisma);

    await expect(repo.findById("op-1")).rejects.toBeInstanceOf(InfrastructureError);
  });

  it("should_throw_infrastructure_error_when_write_fails", async () => {
    const { prisma } = makePrisma({ upsert: jest.fn().mockRejectedValue(new Error("db down")) });
    const repo = new PrismaDailyChallengeIterationRepository(prisma);

    await expect(repo.save(runningOperation())).rejects.toBeInstanceOf(InfrastructureError);
  });
});
