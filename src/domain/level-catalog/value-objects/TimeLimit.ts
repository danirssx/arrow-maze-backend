import { InvalidArgumentError } from "../../errors/DomainError.js";

export class TimeLimit {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(seconds: number): TimeLimit {
    if (!Number.isInteger(seconds) || seconds < 1) {
      throw new InvalidArgumentError(
        "Time limit must be a positive integer (seconds)"
      );
    }
    return new TimeLimit(seconds);
  }

  equals(other: TimeLimit): boolean {
    return this.value === other.value;
  }
}
