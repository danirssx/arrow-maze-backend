import pg from 'pg';

const { Pool } = pg;

export type { Pool } from 'pg';

export function createPool(databaseUrl: string): InstanceType<typeof Pool> {
  return new Pool({ connectionString: databaseUrl });
}
