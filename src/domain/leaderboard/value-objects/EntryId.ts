import { randomUUID } from 'crypto';
import { InvalidArgumentError } from '../../errors/DomainError.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class EntryId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): EntryId {
    if (!value || !UUID_REGEX.test(value)) {
      throw new InvalidArgumentError('Invalid entry ID format');
    }
    return new EntryId(value);
  }

  static generate(): EntryId {
    return new EntryId(randomUUID());
  }

  equals(other: EntryId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
