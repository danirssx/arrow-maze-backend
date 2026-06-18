import pg from 'pg';

const { Pool } = pg;

export type { Pool } from 'pg';

export interface PoolOptions {
  ssl?: boolean;
}

export function createPool(
  databaseUrl: string,
  options: PoolOptions = {}
): InstanceType<typeof Pool> {
  const sslConfig = options.ssl === true
    ? { rejectUnauthorized: false }
    : false;

  return new Pool({
    connectionString: databaseUrl,
    ...(sslConfig !== false && { ssl: sslConfig }),
  });
}
