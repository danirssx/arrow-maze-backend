import type { UseCase } from "../../src/application/aspects/UseCase";
import { TransactionDecorator } from "../../src/application/aspects/TransactionDecorator";
import type { UnitOfWork } from "../../src/application/ports/UnitOfWork";

type TestInput = {
  value: number;
};

type TestOutput = {
  result: number;
};

class FakeUnitOfWork implements UnitOfWork {
  transactionCalls = 0;

  async runInTransaction<Result>(operation: () => Promise<Result>): Promise<Result> {
    this.transactionCalls += 1;

    return operation();
  }
}

describe("TransactionDecorator", () => {
  it("should_run_inner_use_case_inside_transaction_when_execute_is_called", async () => {
    // Arrange
    const unitOfWork = new FakeUnitOfWork();
    const receivedInputs: TestInput[] = [];
    const inner: UseCase<TestInput, TestOutput> = {
      execute: async (input) => {
        receivedInputs.push(input);

        return { result: input.value * 2 };
      }
    };
    const decorator = new TransactionDecorator(inner, unitOfWork);

    // Act
    const result = await decorator.execute({ value: 4 });

    // Assert
    expect(result).toEqual({ result: 8 });
    expect(unitOfWork.transactionCalls).toBe(1);
    expect(receivedInputs).toEqual([{ value: 4 }]);
  });

  it("should_rethrow_error_when_transaction_operation_fails", async () => {
    // Arrange
    const unitOfWork = new FakeUnitOfWork();
    const error = new Error("Persistence failure");
    const inner: UseCase<TestInput, TestOutput> = {
      execute: async () => {
        throw error;
      }
    };
    const decorator = new TransactionDecorator(inner, unitOfWork);

    // Act
    const action = decorator.execute({ value: 4 });

    // Assert
    await expect(action).rejects.toBe(error);
    expect(unitOfWork.transactionCalls).toBe(1);
  });
});

