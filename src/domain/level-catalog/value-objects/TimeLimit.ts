import { InvalidArgumentError } from "../../errors/DomainError.js";

export class TimeLimit {
  private constructor(private readonly value: number) {}

  static create(seconds: number): TimeLimit {
    if (!Number.isInteger(seconds) || seconds < 1) {
      throw new InvalidArgumentError(
        "Time limit must be a positive integer (seconds)"
      );
    }
    return new TimeLimit(seconds);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: TimeLimit): boolean {
    return this.value === other.value;
  }
}
