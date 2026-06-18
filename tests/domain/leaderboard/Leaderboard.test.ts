import { Leaderboard } from '../../../src/domain/leaderboard/Leaderboard.js';
import { ScoreEntry } from '../../../src/domain/leaderboard/ScoreEntry.js';
import { DuplicateEntryError, LeaderboardLevelMismatchError } from '../../../src/domain/leaderboard/errors/LeaderboardErrors.js';
import { LeaderboardUpdatedEvent } from '../../../src/domain/leaderboard/events/LeaderboardUpdatedEvent.js';
import { Rank } from '../../../src/domain/leaderboard/value-objects/Rank.js';
import { EntryId } from '../../../src/domain/leaderboard/value-objects/EntryId.js';
import { LeaderboardId } from '../../../src/domain/leaderboard/value-objects/LeaderboardId.js';
import { LevelId } from '../../../src/domain/leaderboard/value-objects/LevelId.js';
import { MaxLeaderboardEntries } from '../../../src/domain/leaderboard/value-objects/MaxLeaderboardEntries.js';
import { MoveCount } from '../../../src/domain/leaderboard/value-objects/MoveCount.js';
import { Score } from '../../../src/domain/leaderboard/value-objects/Score.js';
import { SubmittedAt } from '../../../src/domain/leaderboard/value-objects/SubmittedAt.js';
import { TimeSeconds } from '../../../src/domain/leaderboard/value-objects/TimeSeconds.js';
import { UserId } from '../../../src/domain/leaderboard/value-objects/UserId.js';
import { UsernameSnapshot } from '../../../src/domain/leaderboard/value-objects/UsernameSnapshot.js';

function makeEntry(overrides?: {
  entryId?: string;
  userId?: string;
  levelId?: string;
  score?: number;
  timeSeconds?: number;
}): ScoreEntry {
  return ScoreEntry.create({
    id: new EntryId(overrides?.entryId ?? 'entry-1'),
    userId: new UserId(overrides?.userId ?? 'user-1'),
    levelId: new LevelId(overrides?.levelId ?? 'level-1'),
    usernameSnapshot: new UsernameSnapshot('PlayerOne'),
    score: new Score(overrides?.score ?? 100),
    timeSeconds: new TimeSeconds(overrides?.timeSeconds ?? 30),
    movesCount: new MoveCount(15),
    submittedAt: SubmittedAt.now(),
  });
}

function makeLeaderboard(maxEntries = 10): Leaderboard {
  return Leaderboard.empty(
    new LeaderboardId('lb-1'),
    new LevelId('level-1'),
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
      const lowScore = makeEntry({ entryId: 'e1', userId: 'u1', score: 50 });
      const highScore = makeEntry({ entryId: 'e2', userId: 'u2', score: 200 });

      leaderboard.submitEntry(lowScore);
      leaderboard.submitEntry(highScore);

      expect(leaderboard.entries[0]?.score.value).toBe(200);
      expect(leaderboard.entries[0]?.rank?.value).toBe(1);
    });

    it('should_break_tie_by_faster_time_when_scores_are_equal', () => {
      const leaderboard = makeLeaderboard();
      const slower = makeEntry({ entryId: 'e1', userId: 'u1', score: 100, timeSeconds: 60 });
      const faster = makeEntry({ entryId: 'e2', userId: 'u2', score: 100, timeSeconds: 20 });

      leaderboard.submitEntry(slower);
      leaderboard.submitEntry(faster);

      expect(leaderboard.entries[0]?.timeSeconds.value).toBe(20);
      expect(leaderboard.entries[0]?.rank?.value).toBe(1);
    });

    it('should_limit_entries_when_max_capacity_reached', () => {
      const leaderboard = makeLeaderboard(2);
      leaderboard.submitEntry(makeEntry({ entryId: 'e1', userId: 'u1', score: 50 }));
      leaderboard.submitEntry(makeEntry({ entryId: 'e2', userId: 'u2', score: 80 }));
      leaderboard.submitEntry(makeEntry({ entryId: 'e3', userId: 'u3', score: 200 }));

      expect(leaderboard.entries).toHaveLength(2);
      expect(leaderboard.entries[0]?.score.value).toBe(200);
    });

    it('should_throw_when_entry_level_does_not_match_leaderboard_level', () => {
      const leaderboard = makeLeaderboard();
      const wrongLevel = makeEntry({ levelId: 'level-99' });

      expect(() => leaderboard.submitEntry(wrongLevel)).toThrow(LeaderboardLevelMismatchError);
    });

    it('should_throw_when_user_already_has_entry', () => {
      const leaderboard = makeLeaderboard();
      leaderboard.submitEntry(makeEntry({ entryId: 'e1', userId: 'u1' }));

      expect(() =>
        leaderboard.submitEntry(makeEntry({ entryId: 'e2', userId: 'u1' })),
      ).toThrow(DuplicateEntryError);
    });
  });

  describe('value objects', () => {
    it('should_throw_when_leaderboard_id_is_empty', () => {
      expect(() => new LeaderboardId('')).toThrow();
    });

    it('should_throw_when_score_is_negative', () => {
      expect(() => new Score(-1)).toThrow();
    });

    it('should_throw_when_time_seconds_is_zero', () => {
      expect(() => new TimeSeconds(0)).toThrow();
    });

    it('should_throw_when_rank_is_zero', () => {
      expect(() => new Rank(0)).toThrow();
    });

    it('should_throw_when_max_entries_is_zero', () => {
      expect(() => new MaxLeaderboardEntries(0)).toThrow();
    });
  });
});
