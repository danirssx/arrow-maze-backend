import type { PrismaClient } from "@prisma/client";
import { PrismaUnitOfWork } from "../../../src/infrastructure/database/PrismaUnitOfWork.js";
import { prismaContext } from "../../../src/infrastructure/database/prismaContext.js";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError.js";

// Subject to human review — infrastructure adapter test

const FAKE_TX = { __tx: true };

function makePrisma(): PrismaClient {
  return {
    $transaction: (cb: (client: unknown) => Promise<unknown>) => cb(FAKE_TX),
  } as unknown as PrismaClient;
}

describe("PrismaUnitOfWork", () => {
  it("should_return_result_when_operation_succeeds", async () => {
    // Arrange
    const uow = new PrismaUnitOfWork(makePrisma());

    // Act
    const result = await uow.runInTransaction(async () => 42);

    // Assert
    expect(result).toBe(42);
  });

  it("should_expose_transaction_client_via_context_during_operation", async () => {
    // Arrange
    const uow = new PrismaUnitOfWork(makePrisma());
    let captured: unknown = null;

    // Act
    await uow.runInTransaction(async () => {
      captured = prismaContext.getStore();
    });

    // Assert — repositories read the active client from the context
    expect(captured).toBe(FAKE_TX);
    // Context is cleared after the transaction ends
    expect(prismaContext.getStore()).toBeUndefined();
  });

  it("should_rethrow_when_operation_throws", async () => {
    // Arrange
    const uow = new PrismaUnitOfWork(makePrisma());
    const error = new Error("operation failed");

    // Act / Assert
    await expect(uow.runInTransaction(async () => { throw error; })).rejects.toBe(error);
  });

  it("should_wrap_non_error_rejection_in_infrastructure_error", async () => {
    // Arrange — $transaction rejects with a non-Error value
    const prisma = { $transaction: () => Promise.reject("boom") } as unknown as PrismaClient;
    const uow = new PrismaUnitOfWork(prisma);

    // Act / Assert
    await expect(uow.runInTransaction(async () => 1)).rejects.toBeInstanceOf(InfrastructureError);
  });
});
