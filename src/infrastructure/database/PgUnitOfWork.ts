// Pattern: Unit of Work
import type { Pool } from "pg";
import type { UnitOfWork } from "../../application/ports/UnitOfWork.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";

export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async runInTransaction<Result>(operation: () => Promise<Result>): Promise<Result> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation();
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      if (err instanceof Error) throw err;
      throw new InfrastructureError("Transaction failed", { cause: String(err) });
    } finally {
      client.release();
    }
  }
}
