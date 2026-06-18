import { InvalidArgumentError } from "../../errors/DomainError.js";

export class LevelVersion {
  private constructor(private readonly value: number) {}

  static create(value: number): LevelVersion {
    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidArgumentError("Level version must be a positive integer");
    }
    return new LevelVersion(value);
  }

  static initial(): LevelVersion {
    return new LevelVersion(1);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: LevelVersion): boolean {
    return this.value === other.value;
  }
}
