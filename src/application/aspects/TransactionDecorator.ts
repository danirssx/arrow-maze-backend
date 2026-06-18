import type { UnitOfWork } from "../ports/UnitOfWork.js";
import type { UseCase } from "./UseCase.js";

// Pattern: Decorator - layer: application
export class TransactionDecorator<Input, Output> implements UseCase<Input, Output> {
  constructor(
    private readonly inner: UseCase<Input, Output>,
    private readonly unitOfWork: UnitOfWork
  ) {}

  execute(input: Input): Promise<Output> {
    return this.unitOfWork.runInTransaction(() => this.inner.execute(input));
  }
}

