import { ValidationError } from '../../../shared/errors/ApplicationError.js';

export interface RawScoreInput {
  score: number;
  timeSeconds: number;
  movesCount: number;
}

export class ScoreValidationService {
  validate(input: RawScoreInput): void {
    if (!Number.isInteger(input.score) || input.score < 0) {
      throw new ValidationError('Score must be a non-negative integer');
    }
    if (input.timeSeconds <= 0) {
      throw new ValidationError('TimeSeconds must be greater than zero');
    }
    if (!Number.isInteger(input.movesCount) || input.movesCount <= 0) {
      throw new ValidationError('MoveCount must be a positive integer');
    }
  }
}
