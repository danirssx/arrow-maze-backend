import { randomUUID } from "crypto";
import { InvalidArgumentError } from "../errors/DomainError.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LevelId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): LevelId {
    if (!value || !UUID_REGEX.test(value)) {
      throw new InvalidArgumentError("Invalid level ID format");
    }
    return new LevelId(value);
  }

  static generate(): LevelId {
    return new LevelId(randomUUID());
  }

  equals(other: LevelId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
