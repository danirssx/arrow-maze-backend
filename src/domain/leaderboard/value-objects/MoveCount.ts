import { InvalidArgumentError } from "../../errors/DomainError.js";

export class MoveCount {
  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new InvalidArgumentError('MoveCount must be a positive integer');
    }
  }
}
