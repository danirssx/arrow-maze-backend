import { PgUnitOfWork } from "../../../src/infrastructure/database/PgUnitOfWork";
import { transactionContext } from "../../../src/infrastructure/database/transactionContext";

// Subject to human review — infrastructure adapter test

class FakeClient {
  readonly queries: string[] = [];
  released = false;

  async query(sql: string): Promise<void> {
    this.queries.push(sql);
  }

  release(): void {
    this.released = true;
  }
}

class FakePool {
  readonly client: FakeClient;

  constructor(client: FakeClient) {
    this.client = client;
  }

  async connect(): Promise<FakeClient> {
    return this.client;
  }
}

describe("PgUnitOfWork", () => {
  it("should_commit_and_return_result_when_operation_succeeds", async () => {
    // Arrange
    const client = new FakeClient();
    const pool = new FakePool(client);
    const uow = new PgUnitOfWork(pool as never);

    // Act
    const result = await uow.runInTransaction(async () => 42);

    // Assert
    expect(result).toBe(42);
    expect(client.queries).toContain("BEGIN");
    expect(client.queries).toContain("COMMIT");
    expect(client.queries).not.toContain("ROLLBACK");
    expect(client.released).toBe(true);
  });

  it("should_rollback_and_rethrow_when_operation_throws", async () => {
    // Arrange
    const client = new FakeClient();
    const pool = new FakePool(client);
    const uow = new PgUnitOfWork(pool as never);
    const error = new Error("operation failed");

    // Act
    const action = uow.runInTransaction(async () => { throw error; });

    // Assert
    await expect(action).rejects.toBe(error);
    expect(client.queries).toContain("BEGIN");
    expect(client.queries).toContain("ROLLBACK");
    expect(client.queries).not.toContain("COMMIT");
    expect(client.released).toBe(true);
  });

  it("should_release_client_even_when_operation_throws", async () => {
    // Arrange
    const client = new FakeClient();
    const pool = new FakePool(client);
    const uow = new PgUnitOfWork(pool as never);

    // Act
    await uow.runInTransaction(async () => { throw new Error("fail"); }).catch(() => {});

    // Assert
    expect(client.released).toBe(true);
  });

  it("should_expose_transactional_client_via_context_during_operation", async () => {
    // Arrange
    const client = new FakeClient();
    const pool = new FakePool(client);
    const uow = new PgUnitOfWork(pool as never);
    let capturedClient: unknown = null;

    // Act
    await uow.runInTransaction(async () => {
      capturedClient = transactionContext.getStore();
    });

    // Assert — repositories can read the active client from the context
    expect(capturedClient).toBe(client);
    // Context is cleared after the transaction ends
    expect(transactionContext.getStore()).toBeUndefined();
  });
});
