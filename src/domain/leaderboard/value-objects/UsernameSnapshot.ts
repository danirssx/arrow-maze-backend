import { InvalidArgumentError } from "../../errors/DomainError.js";

export class UsernameSnapshot {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidArgumentError('UsernameSnapshot cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }
}
