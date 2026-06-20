import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma, PrismaClient } from '@prisma/client';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';

/**
 * Holds the Prisma transaction client that is active for the current async
 * execution. Repositories read it through {@link getClient} so that, when a
 * use case runs inside {@link PrismaUnitOfWork}, every repository call joins the
 * same interactive transaction instead of opening its own connection.
 *
 * This mirrors the previous `pg` transaction context: a single place that
 * decides whether queries run on the shared transactional client or the base
 * client.
 */
export const prismaContext = new AsyncLocalStorage<Prisma.TransactionClient>();

/**
 * The narrow client surface shared by the base {@link PrismaClient} and the
 * interactive transaction client. Repositories depend on this so they never
 * care whether they run inside a transaction.
 */
export type PrismaQueryRunner = Prisma.TransactionClient;

/**
 * Returns the active transaction client when a transaction is in progress, or
 * the base client otherwise.
 */
export function getClient(base: PrismaClient): PrismaQueryRunner {
  return prismaContext.getStore() ?? base;
}

/**
 * Runs `fn` inside a transaction. If a transaction is already active (because an
 * outer {@link PrismaUnitOfWork} opened one), the existing transaction client is
 * reused so the work stays atomic with the rest of the use case. Otherwise a new
 * interactive transaction is opened just for `fn`.
 */
export async function withTransaction<R>(
  base: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<R>,
): Promise<R> {
  const existing = prismaContext.getStore();
  if (existing) {
    return fn(existing);
  }
  try {
    return await base.$transaction((tx) => prismaContext.run(tx, () => fn(tx)));
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new InfrastructureError('Transaction failed', { cause: String(err) });
  }
}
