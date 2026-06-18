import { InvalidArgumentError } from "../../errors/DomainError.js";

export class LevelVersion {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): LevelVersion {
    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidArgumentError("Level version must be a positive integer");
    }
    return new LevelVersion(value);
  }

  static initial(): LevelVersion {
    return new LevelVersion(1);
  }

  equals(other: LevelVersion): boolean {
    return this.value === other.value;
  }
}
