import type { DailyChallengeIterationDto } from "../DailyChallengeIterationTypes.js";

/**
 * Application port for persisting and reading admin manual iteration operations
 * (the sanitized operation log). Infrastructure implements it; application never
 * couples to Prisma. The operation log is an application DTO, not a domain
 * aggregate.
 */
export interface DailyChallengeIterationRepository {
  save(operation: DailyChallengeIterationDto): Promise<void>;
  findById(operationId: string): Promise<DailyChallengeIterationDto | null>;
  findRunningByDate(date: string): Promise<DailyChallengeIterationDto | null>;
}
