import { InvalidArgumentError } from "../../errors/DomainError.js";

const MAX_LENGTH = 500;

export class LevelDescription {
  private constructor(private readonly value: string) {}

  static create(raw: string): LevelDescription {
    const trimmed = raw.trim();
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidArgumentError(
        `Level description must not exceed ${MAX_LENGTH} characters`
      );
    }
    return new LevelDescription(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: LevelDescription): boolean {
    return this.value === other.value;
  }
}
