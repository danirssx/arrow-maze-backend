import { InvalidArgumentError } from "../../errors/DomainError.js";

const MAX_LENGTH = 500;

export class LevelDescription {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): LevelDescription {
    const trimmed = raw.trim();
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidArgumentError(
        `Level description must not exceed ${MAX_LENGTH} characters`
      );
    }
    return new LevelDescription(trimmed);
  }

  equals(other: LevelDescription): boolean {
    return this.value === other.value;
  }
}
