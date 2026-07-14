import type { Logger } from "../ports/Logger.js";
import type { UseCase } from "./UseCase.js";
import { sanitizeLogContext } from "./sanitizeLogContext.js";

type Clock = () => number;

// Pattern: Decorator - layer: application
export class UseCaseLoggingDecorator<Input, Output> implements UseCase<Input, Output> {
  constructor(
    private readonly operationName: string,
    private readonly inner: UseCase<Input, Output>,
    private readonly logger: Logger,
    private readonly clock: Clock = Date.now
  ) {}

  async execute(input: Input): Promise<Output> {
    const startedAt = this.clock();

    this.logger.info("Application use case started", {
      operationName: this.operationName
    });

    try {
      const output = await this.inner.execute(input);
      const durationMs = this.clock() - startedAt;

      this.logger.info("Application use case finished", {
        operationName: this.operationName,
        durationMs,
        status: "success"
      });

      return output;
    } catch (error) {
      const durationMs = this.clock() - startedAt;

      this.logger.error("Application use case failed", sanitizeLogContext({
        operationName: this.operationName,
        durationMs,
        status: "error",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorCause: error instanceof Error && (error as { details?: unknown }).details ? JSON.stringify((error as { details?: unknown }).details) : String(error)
      }));

      throw error;
    }
  }
}

