import { randomUUID } from 'crypto';
import { InvalidArgumentError } from '../../errors/DomainError.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LeaderboardId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): LeaderboardId {
    if (!value || !UUID_REGEX.test(value)) {
      throw new InvalidArgumentError('Invalid leaderboard ID format');
    }
    return new LeaderboardId(value);
  }

  static generate(): LeaderboardId {
    return new LeaderboardId(randomUUID());
  }

  equals(other: LeaderboardId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
