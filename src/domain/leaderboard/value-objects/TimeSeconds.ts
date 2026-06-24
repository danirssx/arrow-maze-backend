import { InvalidArgumentError } from "../../errors/DomainError.js";

export class TimeSeconds {
  constructor(readonly value: number) {
    if (isNaN(value) || value <= 0) {
      throw new InvalidArgumentError('TimeSeconds must be greater than zero');
    }
  }

  isFasterThan(other: TimeSeconds): boolean {
    return this.value < other.value;
  }
}
