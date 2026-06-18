import { InvalidArgumentError } from "../../errors/DomainError.js";

export class MoveCount {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(count: number): MoveCount {
    if (!Number.isInteger(count) || count < 1) {
      throw new InvalidArgumentError("Move count must be a positive integer");
    }
    return new MoveCount(count);
  }

  equals(other: MoveCount): boolean {
    return this.value === other.value;
  }
}
