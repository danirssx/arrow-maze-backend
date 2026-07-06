import { InvalidArgumentError } from '../../errors/DomainError.js';

export class CompletedAt {
  /**
   * Tolerated clock skew between a mobile device clock and the server clock.
   * A completion timestamp up to this far ahead of the server is accepted as a
   * device-clock skew (see MAZ-190); anything farther is treated as a clearly
   * invalid future timestamp and rejected.
   */
  static readonly CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

  constructor(readonly value: Date) {
    if (Number.isNaN(value.getTime())) {
      throw new InvalidArgumentError('CompletedAt must be a valid date');
    }

    if (value.getTime() > Date.now() + CompletedAt.CLOCK_SKEW_TOLERANCE_MS) {
      throw new InvalidArgumentError('CompletedAt is too far in the future');
    }
  }
}
