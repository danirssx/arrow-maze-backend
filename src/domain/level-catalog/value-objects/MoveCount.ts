import { InvalidArgumentError } from "../../errors/DomainError.js";

export class MoveCount {
  private constructor(private readonly value: number) {}

  static create(count: number): MoveCount {
    if (!Number.isInteger(count) || count < 1) {
      throw new InvalidArgumentError("Move count must be a positive integer");
    }
    return new MoveCount(count);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: MoveCount): boolean {
    return this.value === other.value;
  }
}
