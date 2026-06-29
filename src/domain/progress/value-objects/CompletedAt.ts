import { InvalidArgumentError } from '../../errors/DomainError.js';

export class CompletedAt {
  constructor(readonly value: Date) {
    if (Number.isNaN(value.getTime())) {
      throw new InvalidArgumentError('CompletedAt must be a valid date');
    }

    if (value.getTime() > Date.now()) {
      throw new InvalidArgumentError('CompletedAt cannot be in the future');
    }
  }

  static now(): CompletedAt {
    return new CompletedAt(new Date());
  }
}
