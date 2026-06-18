import { randomUUID } from "crypto";
import { InvalidArgumentError } from "../../errors/DomainError.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UserId {
  private constructor(private readonly value: string) {}

  static create(value: string): UserId {
    if (!value || !UUID_REGEX.test(value)) {
      throw new InvalidArgumentError("Invalid user ID format");
    }
    return new UserId(value);
  }

  static generate(): UserId {
    return new UserId(randomUUID());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}
