import { InvalidArgumentError } from "../../errors/DomainError.js";

export class ProgressVersion {
  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new InvalidArgumentError('ProgressVersion must be a non-negative integer');
    }
  }

  increment(): ProgressVersion {
    return new ProgressVersion(this.value + 1);
  }

  isAheadOf(other: ProgressVersion): boolean {
    return this.value > other.value;
  }
}
