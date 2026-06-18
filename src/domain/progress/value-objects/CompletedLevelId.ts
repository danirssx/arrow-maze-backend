export class CompletedLevelId {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('CompletedLevelId cannot be empty');
    }
  }

  equals(other: CompletedLevelId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
