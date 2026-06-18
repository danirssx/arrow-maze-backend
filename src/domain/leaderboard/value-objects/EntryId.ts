export class EntryId {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('EntryId cannot be empty');
    }
  }

  equals(other: EntryId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
