import { InvalidArgumentError } from "../../errors/DomainError.js";

const MIN_LENGTH = 8;

export class RawPassword {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): RawPassword {
    if (!raw || raw.length < MIN_LENGTH) {
      throw new InvalidArgumentError(
        `Password must be at least ${MIN_LENGTH} characters`
      );
    }
    return new RawPassword(raw);
  }
}
