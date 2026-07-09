import { LevelScore } from '../../../../src/domain/progress/value-objects/LevelScore.js';
import { InvalidArgumentError } from '../../../../src/domain/errors/DomainError.js';

describe('LevelScore', () => {
  describe('constructor', () => {
    it('should_create_valid_instance_when_all_values_are_valid', () => {
      const score = new LevelScore(100, 30, 10);

      expect(score.score).toBe(100);
      expect(score.timeSeconds).toBe(30);
      expect(score.movesCount).toBe(10);
    });

    it('should_allow_score_of_zero_when_player_scores_nothing', () => {
      const score = new LevelScore(0, 30, 10);

      expect(score.score).toBe(0);
    });

    it('should_throw_when_score_is_negative', () => {
      expect(() => new LevelScore(-1, 30, 10)).toThrow(InvalidArgumentError);
    });

    it('should_throw_when_score_is_non_integer', () => {
      expect(() => new LevelScore(1.5, 30, 10)).toThrow(InvalidArgumentError);
    });

    it('should_throw_when_time_seconds_is_zero', () => {
      expect(() => new LevelScore(100, 0, 10)).toThrow(InvalidArgumentError);
    });

    it('should_throw_when_time_seconds_is_negative', () => {
      expect(() => new LevelScore(100, -5, 10)).toThrow(InvalidArgumentError);
    });

    it('should_throw_when_time_seconds_is_NaN', () => {
      expect(() => new LevelScore(100, NaN, 10)).toThrow(InvalidArgumentError);
    });

    it('should_throw_when_moves_count_is_zero', () => {
      expect(() => new LevelScore(100, 30, 0)).toThrow(InvalidArgumentError);
    });

    it('should_throw_when_moves_count_is_negative', () => {
      expect(() => new LevelScore(100, 30, -1)).toThrow(InvalidArgumentError);
    });

    it('should_throw_when_moves_count_is_non_integer', () => {
      expect(() => new LevelScore(100, 30, 1.5)).toThrow(InvalidArgumentError);
    });
  });

  describe('isBetterThan', () => {
    it('should_return_true_when_score_is_higher', () => {
      const current = new LevelScore(200, 60, 20);
      const previous = new LevelScore(100, 30, 10);

      expect(current.isBetterThan(previous)).toBe(true);
    });

    it('should_return_false_when_score_is_lower', () => {
      const current = new LevelScore(100, 30, 10);
      const previous = new LevelScore(200, 60, 20);

      expect(current.isBetterThan(previous)).toBe(false);
    });

    it('should_return_true_when_score_is_equal_and_time_is_better', () => {
      const current = new LevelScore(100, 20, 10);
      const previous = new LevelScore(100, 30, 10);

      expect(current.isBetterThan(previous)).toBe(true);
    });

    it('should_return_false_when_score_is_equal_and_time_is_worse', () => {
      const current = new LevelScore(100, 40, 10);
      const previous = new LevelScore(100, 30, 10);

      expect(current.isBetterThan(previous)).toBe(false);
    });

    it('should_return_false_when_score_and_time_are_identical', () => {
      const current = new LevelScore(100, 30, 10);
      const previous = new LevelScore(100, 30, 10);

      expect(current.isBetterThan(previous)).toBe(false);
    });

    it('should_return_true_when_score_is_higher_despite_worse_time', () => {
      const current = new LevelScore(200, 90, 20);
      const previous = new LevelScore(100, 10, 5);

      expect(current.isBetterThan(previous)).toBe(true);
    });

    it('should_return_false_when_score_is_lower_despite_better_time', () => {
      const current = new LevelScore(100, 10, 5);
      const previous = new LevelScore(200, 90, 20);

      expect(current.isBetterThan(previous)).toBe(false);
    });
  });
});
