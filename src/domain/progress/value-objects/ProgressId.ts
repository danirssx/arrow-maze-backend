export class ProgressId {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ProgressId cannot be empty');
    }
  }

  equals(other: ProgressId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
