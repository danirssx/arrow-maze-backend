export class LeaderboardId {
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('LeaderboardId cannot be empty');
    }
  }

  equals(other: LeaderboardId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
