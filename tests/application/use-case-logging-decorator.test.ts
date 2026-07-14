import type { Logger } from "../../src/application/ports/Logger";
import type { UseCase } from "../../src/application/aspects/UseCase";
import { UseCaseLoggingDecorator } from "../../src/application/aspects/UseCaseLoggingDecorator";

type TestInput = {
  value: number;
};

type TestOutput = {
  result: number;
};

class FakeLogger implements Logger {
  readonly infoCalls: Array<{ message: string; context?: Record<string, unknown> }> = [];
  readonly warnCalls: Array<{ message: string; context?: Record<string, unknown> }> = [];
  readonly errorCalls: Array<{ message: string; context?: Record<string, unknown> }> = [];

  info(message: string, context?: Record<string, unknown>): void {
    this.infoCalls.push({ message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.warnCalls.push({ message, context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.errorCalls.push({ message, context });
  }
}

describe("UseCaseLoggingDecorator", () => {
  it("should_log_start_and_finish_when_use_case_succeeds", async () => {
    // Arrange
    const inner: UseCase<TestInput, TestOutput> = {
      execute: async (input) => ({ result: input.value + 1 })
    };
    const logger = new FakeLogger();
    const clockValues = [100, 145];
    const decorator = new UseCaseLoggingDecorator(
      "RegisterUserService",
      inner,
      logger,
      () => clockValues.shift() ?? 145
    );

    // Act
    const result = await decorator.execute({ value: 2 });

    // Assert
    expect(result).toEqual({ result: 3 });
    expect(logger.infoCalls).toEqual([
      {
        message: "Application use case started",
        context: { operationName: "RegisterUserService" }
      },
      {
        message: "Application use case finished",
        context: {
          operationName: "RegisterUserService",
          durationMs: 45,
          status: "success"
        }
      }
    ]);
    expect(logger.errorCalls).toEqual([]);
  });

  it("should_log_sanitized_error_and_rethrow_when_use_case_fails", async () => {
    // Arrange
    const error = new Error("Invalid Bearer raw-token-value");
    const inner: UseCase<TestInput, TestOutput> = {
      execute: async () => {
        throw error;
      }
    };
    const logger = new FakeLogger();
    const clockValues = [10, 16];
    const decorator = new UseCaseLoggingDecorator(
      "LoginService",
      inner,
      logger,
      () => clockValues.shift() ?? 16
    );

    // Act
    const action = decorator.execute({ value: 1 });

    // Assert
    await expect(action).rejects.toBe(error);
    expect(logger.errorCalls).toEqual([
      {
        message: "Application use case failed",
        context: {
          operationName: "LoginService",
          durationMs: 6,
          status: "error",
          errorName: "Error",
          errorMessage: "Invalid Bearer [REDACTED]",
          errorCause: expect.any(String)
        }
      }
    ]);
  });
});

