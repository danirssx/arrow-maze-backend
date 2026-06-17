export class LevelId {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('LevelId cannot be empty');
    }
  }

  equals(other: LevelId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
