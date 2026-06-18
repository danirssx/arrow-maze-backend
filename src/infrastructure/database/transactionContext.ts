import { AsyncLocalStorage } from 'node:async_hooks';
import type { Pool, PoolClient } from 'pg';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';

export const transactionContext = new AsyncLocalStorage<PoolClient>();

export function getQueryRunner(pool: Pool): Pool | PoolClient {
  return transactionContext.getStore() ?? pool;
}

export async function withTransactionalClient<R>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<R>,
): Promise<R> {
  const existing = transactionContext.getStore();
  if (existing) {
    return fn(existing);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof Error) throw err;
    throw new InfrastructureError('Transaction failed', { cause: String(err) });
  } finally {
    client.release();
  }
}
