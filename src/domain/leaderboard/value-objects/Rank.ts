import { InvalidArgumentError } from "../../errors/DomainError.js";

export class Rank {
  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidArgumentError('Rank must be a positive integer starting at 1');
    }
  }
}
