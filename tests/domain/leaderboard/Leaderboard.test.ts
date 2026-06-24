import { Leaderboard } from '../../../src/domain/leaderboard/Leaderboard.js';
import { ScoreEntry } from '../../../src/domain/leaderboard/ScoreEntry.js';
import { DuplicateEntryError, LeaderboardLevelMismatchError } from '../../../src/domain/leaderboard/errors/LeaderboardErrors.js';
import { LeaderboardUpdatedEvent } from '../../../src/domain/leaderboard/events/LeaderboardUpdatedEvent.js';
import { Rank } from '../../../src/domain/leaderboard/value-objects/Rank.js';
import { EntryId } from '../../../src/domain/leaderboard/value-objects/EntryId.js';
import { LeaderboardId } from '../../../src/domain/leaderboard/value-objects/LeaderboardId.js';
import { MaxLeaderboardEntries } from '../../../src/domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { MoveCount } from '../../../src/domain/leaderboard/value-objects/MoveCount.js';
import { Score } from '../../../src/domain/leaderboard/value-objects/Score.js';
import { SubmittedAt } from '../../../src/domain/leaderboard/value-objects/SubmittedAt.js';
import { TimeSeconds } from '../../../src/domain/leaderboard/value-objects/TimeSeconds.js';
import { UsernameSnapshot } from '../../../src/domain/leaderboard/value-objects/UsernameSnapshot.js';
import { LevelId } from '../../../src/domain/shared/LevelId.js';
import { UserId } from '../../../src/domain/shared/UserId.js';
import { InvalidArgumentError } from '../../../src/domain/errors/DomainError.js';

const USER_1 = '550e8400-e29b-41d4-a716-446655440001';
const USER_2 = '550e8400-e29b-41d4-a716-446655440002';
const USER_3 = '550e8400-e29b-41d4-a716-446655440003';
const LEVEL_1 = '550e8400-e29b-41d4-a716-446655440010';
const LEVEL_99 = '550e8400-e29b-41d4-a716-446655440099';
const LB_1 = '550e8400-e29b-41d4-a716-446655440020';
const ENTRY_1 = '550e8400-e29b-41d4-a716-446655440030';
const ENTRY_2 = '550e8400-e29b-41d4-a716-446655440031';
const ENTRY_3 = '550e8400-e29b-41d4-a716-446655440032';

function makeEntry(overrides?: {
  entryId?: string;
  userId?: string;
  levelId?: string;
  score?: number;
  timeSeconds?: number;
}): ScoreEntry {
  return ScoreEntry.create({
    id: EntryId.create(overrides?.entryId ?? ENTRY_1),
    userId: UserId.create(overrides?.userId ?? USER_1),
    levelId: LevelId.create(overrides?.levelId ?? LEVEL_1),
    usernameSnapshot: new UsernameSnapshot('PlayerOne'),
    score: new Score(overrides?.score ?? 100),
    timeSeconds: new TimeSeconds(overrides?.timeSeconds ?? 30),
    movesCount: new MoveCount(15),
    submittedAt: SubmittedAt.now(),
  });
}

function makeLeaderboard(maxEntries = 10): Leaderboard {
  return Leaderboard.empty(
    LeaderboardId.create(LB_1),
    LevelId.create(LEVEL_1),
    new MaxLeaderboardEntries(maxEntries),
  );
}

describe('Leaderboard', () => {
  describe('submitEntry', () => {
    it('should_add_entry_when_valid_entry_submitted', () => {
      const leaderboard = makeLeaderboard();
      const entry = makeEntry();

      leaderboard.submitEntry(entry);

      expect(leaderboard.entries).toHaveLength(1);
    });

    it('should_assign_rank_1_when_first_entry_submitted', () => {
      const leaderboard = makeLeaderboard();
      const entry = makeEntry();

      leaderboard.submitEntry(entry);

      expect(leaderboard.entries[0]?.rank?.value).toBe(1);
    });

    it('should_record_domain_event_when_entry_submitted', () => {
      const leaderboard = makeLeaderboard();
      const entry = makeEntry();

      leaderboard.submitEntry(entry);

      expect(leaderboard.domainEvents).toHaveLength(1);
      expect(leaderboard.domainEvents[0]).toBeInstanceOf(LeaderboardUpdatedEvent);
    });

    it('should_rank_higher_score_first_when_two_entries_submitted', () => {
      const leaderboard = makeLeaderboard();
      const lowScore = makeEntry({ entryId: ENTRY_1, userId: USER_1, score: 50 });
      const highScore = makeEntry({ entryId: ENTRY_2, userId: USER_2, score: 200 });

      leaderboard.submitEntry(lowScore);
      leaderboard.submitEntry(highScore);

      expect(leaderboard.entries[0]?.score.value).toBe(200);
      expect(leaderboard.entries[0]?.rank?.value).toBe(1);
    });

    it('should_break_tie_by_faster_time_when_scores_are_equal', () => {
      const leaderboard = makeLeaderboard();
      const slower = makeEntry({ entryId: ENTRY_1, userId: USER_1, score: 100, timeSeconds: 60 });
      const faster = makeEntry({ entryId: ENTRY_2, userId: USER_2, score: 100, timeSeconds: 20 });

      leaderboard.submitEntry(slower);
      leaderboard.submitEntry(faster);

      expect(leaderboard.entries[0]?.timeSeconds.value).toBe(20);
      expect(leaderboard.entries[0]?.rank?.value).toBe(1);
    });

    it('should_limit_entries_when_max_capacity_reached', () => {
      const leaderboard = makeLeaderboard(2);
      leaderboard.submitEntry(makeEntry({ entryId: ENTRY_1, userId: USER_1, score: 50 }));
      leaderboard.submitEntry(makeEntry({ entryId: ENTRY_2, userId: USER_2, score: 80 }));
      leaderboard.submitEntry(makeEntry({ entryId: ENTRY_3, userId: USER_3, score: 200 }));

      expect(leaderboard.entries).toHaveLength(2);
      expect(leaderboard.entries[0]?.score.value).toBe(200);
    });

    it('should_throw_when_entry_level_does_not_match_leaderboard_level', () => {
      const leaderboard = makeLeaderboard();
      const wrongLevel = makeEntry({ levelId: LEVEL_99 });

      expect(() => leaderboard.submitEntry(wrongLevel)).toThrow(LeaderboardLevelMismatchError);
    });

    it('should_throw_when_user_already_has_entry', () => {
      const leaderboard = makeLeaderboard();
      leaderboard.submitEntry(makeEntry({ entryId: ENTRY_1, userId: USER_1 }));

      expect(() =>
        leaderboard.submitEntry(makeEntry({ entryId: ENTRY_2, userId: USER_1 })),
      ).toThrow(DuplicateEntryError);
    });
  });

  describe('value objects', () => {
    it('should_throw_when_leaderboard_id_is_empty', () => {
      expect(() => LeaderboardId.create('')).toThrow();
    });

    it('should_throw_invalid_argument_error_when_score_is_negative', () => {
      expect(() => new Score(-1)).toThrow(InvalidArgumentError);
    });

    it('should_throw_invalid_argument_error_when_score_is_decimal', () => {
      expect(() => new Score(1.5)).toThrow(InvalidArgumentError);
    });

    it('should_throw_invalid_argument_error_when_time_seconds_is_zero', () => {
      expect(() => new TimeSeconds(0)).toThrow(InvalidArgumentError);
    });

    it('should_throw_invalid_argument_error_when_move_count_is_zero', () => {
      expect(() => new MoveCount(0)).toThrow(InvalidArgumentError);
    });

    it('should_throw_invalid_argument_error_when_rank_is_zero', () => {
      expect(() => new Rank(0)).toThrow(InvalidArgumentError);
    });

    it('should_throw_invalid_argument_error_when_max_entries_is_zero', () => {
      expect(() => new MaxLeaderboardEntries(0)).toThrow(InvalidArgumentError);
    });

    it('should_throw_invalid_argument_error_when_username_snapshot_is_empty', () => {
      expect(() => new UsernameSnapshot('')).toThrow(InvalidArgumentError);
    });

    it('should_not_expose_http_status_on_invalid_argument_error', () => {
      expect.assertions(2);
      try {
        new Score(-1);
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidArgumentError);
        expect('httpStatus' in (e as object)).toBe(false);
      }
    });

    // --- StringLiteral survivors ---
    it('should_throw_with_exact_message_when_score_is_negative', () => {
      expect(() => new Score(-1)).toThrow('Score must be a non-negative integer');
    });

    it('should_throw_with_exact_message_when_time_seconds_is_zero', () => {
      expect(() => new TimeSeconds(0)).toThrow('TimeSeconds must be greater than zero');
    });

    it('should_throw_with_exact_message_when_move_count_is_zero', () => {
      expect(() => new MoveCount(0)).toThrow('MoveCount must be a positive integer');
    });

    it('should_throw_with_exact_message_when_rank_is_zero', () => {
      expect(() => new Rank(0)).toThrow('Rank must be a positive integer starting at 1');
    });

    it('should_throw_with_exact_message_when_max_entries_is_zero', () => {
      expect(() => new MaxLeaderboardEntries(0)).toThrow('MaxLeaderboardEntries must be a positive integer');
    });

    it('should_throw_with_exact_message_when_username_snapshot_is_empty', () => {
      expect(() => new UsernameSnapshot('')).toThrow('UsernameSnapshot cannot be empty');
    });

    // --- Boundary exact survivors ---
    it('should_be_valid_when_score_is_zero', () => {
      expect(() => new Score(0)).not.toThrow();
      expect(new Score(0).value).toBe(0);
    });

    it('should_be_valid_when_move_count_is_one', () => {
      expect(() => new MoveCount(1)).not.toThrow();
      expect(new MoveCount(1).value).toBe(1);
    });

    it('should_be_valid_when_max_entries_is_one', () => {
      expect(() => new MaxLeaderboardEntries(1)).not.toThrow();
      expect(new MaxLeaderboardEntries(1).value).toBe(1);
    });

    // --- UsernameSnapshot whitespace-only survivor ---
    it('should_throw_when_username_snapshot_is_whitespace_only', () => {
      expect(() => new UsernameSnapshot('   ')).toThrow(InvalidArgumentError);
    });

    it('should_throw_with_exact_message_when_username_snapshot_is_whitespace_only', () => {
      expect(() => new UsernameSnapshot('   ')).toThrow('UsernameSnapshot cannot be empty');
    });

    // --- NoCoverage methods ---
    it('should_return_true_when_score_is_higher_than_other', () => {
      const high = new Score(100);
      const low = new Score(50);
      expect(high.isHigherThan(low)).toBe(true);
    });

    it('should_return_false_when_score_is_lower_than_other', () => {
      const low = new Score(50);
      const high = new Score(100);
      expect(low.isHigherThan(high)).toBe(false);
    });

    it('should_return_false_when_score_equals_other', () => {
      const a = new Score(75);
      const b = new Score(75);
      expect(a.isHigherThan(b)).toBe(false);
    });

    it('should_return_true_when_time_is_faster_than_other', () => {
      const fast = new TimeSeconds(10);
      const slow = new TimeSeconds(30);
      expect(fast.isFasterThan(slow)).toBe(true);
    });

    it('should_return_false_when_time_is_slower_than_other', () => {
      const slow = new TimeSeconds(30);
      const fast = new TimeSeconds(10);
      expect(slow.isFasterThan(fast)).toBe(false);
    });

    it('should_return_false_when_time_equals_other', () => {
      const a = new TimeSeconds(20);
      const b = new TimeSeconds(20);
      expect(a.isFasterThan(b)).toBe(false);
    });

    it('should_return_value_string_when_username_snapshot_toString_called', () => {
      const username = new UsernameSnapshot('PlayerOne');
      expect(username.toString()).toBe('PlayerOne');
    });
  });
});
