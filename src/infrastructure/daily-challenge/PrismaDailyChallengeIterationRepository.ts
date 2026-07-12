// Pattern: Repository, Adapter
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { DailyChallengeIterationRepository } from "../../application/daily-challenge/ports/DailyChallengeIterationRepository.js";
import type {
  DailyChallengeIterationDto,
  DailyChallengeIterationEventDto,
  DailyChallengeIterationStatus,
} from "../../application/daily-challenge/DailyChallengeIterationTypes.js";
import type { DailyChallengeDto } from "../../application/daily-challenge/DailyChallengeTypes.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";
import { getClient } from "../database/prismaContext.js";

type IterationRecord = {
  operationId: string;
  date: string;
  status: string;
  requestedAt: Date;
  completedAt: Date | null;
  events: unknown;
  challenge: unknown;
};

const TERMINAL_STATUSES: readonly DailyChallengeIterationStatus[] = [
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
];

export class PrismaDailyChallengeIterationRepository
  implements DailyChallengeIterationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async save(operation: DailyChallengeIterationDto): Promise<void> {
    try {
      const now = new Date();
      const data = iterationToRecord(operation);
      await getClient(this.prisma).dailyChallengeIteration.upsert({
        where: { operationId: operation.operationId },
        create: { ...data, createdAt: now, updatedAt: now },
        update: { ...data, updatedAt: now },
      });
    } catch (err) {
      if (err instanceof InfrastructureError) throw err;
      throw new InfrastructureError("Failed to save daily challenge iteration", {
        cause: String(err),
      });
    }
  }

  async findById(operationId: string): Promise<DailyChallengeIterationDto | null> {
    try {
      const record = await getClient(this.prisma).dailyChallengeIteration.findUnique({
        where: { operationId },
      });
      return record === null ? null : recordToIteration(record);
    } catch (err) {
      if (err instanceof InfrastructureError) throw err;
      throw new InfrastructureError("Failed to find daily challenge iteration", {
        cause: String(err),
      });
    }
  }

  async findRunningByDate(date: string): Promise<DailyChallengeIterationDto | null> {
    try {
      const record = await getClient(this.prisma).dailyChallengeIteration.findFirst({
        where: { date, status: "RUNNING" },
        orderBy: { requestedAt: "desc" },
      });
      return record === null ? null : recordToIteration(record);
    } catch (err) {
      if (err instanceof InfrastructureError) throw err;
      throw new InfrastructureError("Failed to find running daily challenge iteration", {
        cause: String(err),
      });
    }
  }
}

function iterationToRecord(operation: DailyChallengeIterationDto) {
  return {
    operationId: operation.operationId,
    date: operation.date,
    status: operation.status,
    requestedAt: new Date(operation.requestedAt),
    completedAt: operation.completedAt === null ? null : new Date(operation.completedAt),
    events: operation.events as unknown as Prisma.InputJsonValue,
    challenge:
      operation.challenge === null
        ? Prisma.JsonNull
        : (operation.challenge as unknown as Prisma.InputJsonValue),
  };
}

function recordToIteration(record: IterationRecord): DailyChallengeIterationDto {
  if (!isIterationStatus(record.status)) {
    throw new InfrastructureError("Corrupted DB value for daily challenge iteration status");
  }
  if (!Array.isArray(record.events)) {
    throw new InfrastructureError("Corrupted DB value for daily challenge iteration events");
  }
  return {
    operationId: record.operationId,
    date: record.date,
    status: record.status,
    requestedAt: record.requestedAt.toISOString(),
    completedAt: record.completedAt === null ? null : record.completedAt.toISOString(),
    events: record.events as DailyChallengeIterationEventDto[],
    challenge: record.challenge === null ? null : (record.challenge as DailyChallengeDto),
  };
}

function isIterationStatus(value: string): value is DailyChallengeIterationStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(value);
}
