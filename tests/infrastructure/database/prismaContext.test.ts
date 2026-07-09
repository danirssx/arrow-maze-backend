import { jest } from "@jest/globals";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getClient, prismaContext, withTransaction } from "../../../src/infrastructure/database/prismaContext.js";
import { InfrastructureError } from "../../../src/shared/errors/InfrastructureError.js";

// Subject to human review — infrastructure adapter test

const BASE = { __base: true } as unknown as PrismaClient;

describe("prismaContext", () => {
  describe("getClient", () => {
    it("should_return_base_client_when_no_transaction_active", () => {
      // Act / Assert
      expect(getClient(BASE)).toBe(BASE);
    });

    it("should_return_transaction_client_when_inside_run", () => {
      // Arrange
      const tx = { __tx: true } as unknown as Prisma.TransactionClient;
      let captured: unknown;

      // Act
      prismaContext.run(tx, () => {
        captured = getClient(BASE);
      });

      // Assert
      expect(captured).toBe(tx);
    });
  });

  describe("withTransaction", () => {
    it("should_open_a_new_transaction_when_none_active", async () => {
      // Arrange
      const tx = { __tx: true };
      const $transaction = jest.fn((cb: (client: unknown) => Promise<unknown>) => cb(tx));
      const prisma = { $transaction } as unknown as PrismaClient;
      let seen: unknown;

      // Act
      const result = await withTransaction(prisma, async (client) => {
        seen = client;
        return "ok";
      });

      // Assert
      expect(result).toBe("ok");
      expect(seen).toBe(tx);
      expect($transaction).toHaveBeenCalledTimes(1);
    });

    it("should_reuse_active_transaction_without_opening_a_new_one", async () => {
      // Arrange
      const outerTx = { __outer: true } as unknown as Prisma.TransactionClient;
      const $transaction = jest.fn();
      const prisma = { $transaction } as unknown as PrismaClient;
      let seen: unknown;

      // Act
      await prismaContext.run(outerTx, async () => {
        await withTransaction(prisma, async (client) => {
          seen = client;
        });
      });

      // Assert
      expect(seen).toBe(outerTx);
      expect($transaction).not.toHaveBeenCalled();
    });

    it("should_wrap_non_error_rejection_in_infrastructure_error", async () => {
      // Arrange
      const prisma = { $transaction: () => Promise.reject("boom") } as unknown as PrismaClient;

      // Act / Assert
      await expect(withTransaction(prisma, async () => 1)).rejects.toBeInstanceOf(InfrastructureError);
    });
  });
});
