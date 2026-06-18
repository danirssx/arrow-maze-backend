export class UsernameSnapshot {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('UsernameSnapshot cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }
}
