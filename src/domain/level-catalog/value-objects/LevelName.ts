import { InvalidArgumentError } from "../../errors/DomainError.js";

const MIN_LENGTH = 1;
const MAX_LENGTH = 100;

export class LevelName {
  private constructor(private readonly value: string) {}

  static create(raw: string): LevelName {
    const trimmed = raw.trim();
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      throw new InvalidArgumentError(
        `Level name must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`
      );
    }
    return new LevelName(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: LevelName): boolean {
    return this.value === other.value;
  }
}
