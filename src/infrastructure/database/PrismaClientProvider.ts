// Pattern: Adapter
import type { PoolConfig } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export type { PrismaClient } from '@prisma/client';

export interface PrismaClientOptions {
  ssl?: boolean;
}

/**
 * Builds the application's {@link PrismaClient} backed by the `pg` driver
 * adapter. Prisma 7 connects through a JS driver adapter instead of a bundled
 * query engine, so the connection string and SSL settings are handed to the
 * `pg` pool that the adapter manages internally.
 *
 * SSL mirrors the previous pool behaviour: cloud providers require TLS, and we
 * relax certificate verification the same way the raw `pg` pool did.
 */
export function createPrismaClient(
  databaseUrl: string,
  options: PrismaClientOptions = {},
): PrismaClient {
  const poolConfig: PoolConfig = {
    connectionString: databaseUrl,
    ...(options.ssl === true ? { ssl: { rejectUnauthorized: false } } : {}),
  };

  const adapter = new PrismaPg(poolConfig);
  return new PrismaClient({ adapter });
}
