// Pattern: Unit of Work
import type { PrismaClient } from '@prisma/client';
import type { UnitOfWork } from '../../application/ports/UnitOfWork.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { prismaContext } from './prismaContext.js';

/**
 * Runs a use case inside a single Prisma interactive transaction. The
 * transaction client is published on {@link prismaContext} for the duration of
 * the operation, so every repository invoked by the use case automatically
 * joins the same transaction (commit on success, rollback on throw).
 */
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async runInTransaction<Result>(operation: () => Promise<Result>): Promise<Result> {
    try {
      return await this.prisma.$transaction((tx) => prismaContext.run(tx, operation));
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new InfrastructureError('Transaction failed', { cause: String(err) });
    }
  }
}
