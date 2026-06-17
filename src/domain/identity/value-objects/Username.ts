import { InvalidArgumentError } from "../../errors/DomainError.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

export class Username {
  private constructor(private readonly value: string) {}

  static create(raw: string): Username {
    const trimmed = raw.trim();
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      throw new InvalidArgumentError(
        `Username must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`
      );
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      throw new InvalidArgumentError(
        "Username can only contain letters, numbers and underscores"
      );
    }
    return new Username(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }
}
