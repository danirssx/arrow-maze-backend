import { Entity } from '../shared/Entity.js';
import { LeaderboardUpdatedEvent } from './events/LeaderboardUpdatedEvent.js';
import { LeaderboardLevelMismatchError } from './errors/LeaderboardErrors.js';
import type { ScoreEntry } from './ScoreEntry.js';
import type { LeaderboardId } from './value-objects/LeaderboardId.js';
import type { LevelId } from '../shared/LevelId.js';
import type { MaxLeaderboardEntries } from './value-objects/MaxLeaderboardEntries.js';
import { Rank } from './value-objects/Rank.js';
import { UpdatedAt } from './value-objects/UpdatedAt.js';

export interface LeaderboardProps {
  id: LeaderboardId;
  levelId: LevelId;
  entries: ScoreEntry[];
  maxEntries: MaxLeaderboardEntries;
  updatedAt: UpdatedAt;
}

export class Leaderboard extends Entity<LeaderboardId> {
  private _entries: ScoreEntry[];
  readonly levelId: LevelId;
  readonly maxEntries: MaxLeaderboardEntries;
  private _updatedAt: UpdatedAt;

  private constructor(props: LeaderboardProps) {
    super(props.id);
    this.levelId = props.levelId;
    this._entries = props.entries;
    this.maxEntries = props.maxEntries;
    this._updatedAt = props.updatedAt;
  }

  static create(props: LeaderboardProps): Leaderboard {
    return new Leaderboard(props);
  }

  static empty(id: LeaderboardId, levelId: LevelId, maxEntries: MaxLeaderboardEntries): Leaderboard {
    return new Leaderboard({
      id,
      levelId,
      entries: [],
      maxEntries,
      updatedAt: UpdatedAt.now(),
    });
  }

  get entries(): ReadonlyArray<ScoreEntry> {
    return this._entries;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  // Best-score upsert: a user keeps a single entry per level. A resubmission
  // replaces the stored entry only when it is strictly better; a worse or equal
  // resubmission is an idempotent no-op (kept best, no event, no rank churn).
  submitEntry(entry: ScoreEntry): void {
    if (!entry.levelId.equals(this.levelId)) {
      throw new LeaderboardLevelMismatchError(entry.levelId.value, this.levelId.value);
    }

    const existing = this._entries.find((e) => e.userId.equals(entry.userId));
    if (existing !== undefined) {
      if (!entry.isBetterThan(existing)) {
        return;
      }
      this._entries = this._entries.filter((e) => e !== existing);
    }

    this._entries.push(entry);
    this._entries = this.rankEntries(this._entries).slice(0, this.maxEntries.value);
    this._updatedAt = UpdatedAt.now();

    this.record(
      new LeaderboardUpdatedEvent(this.id.value, entry.id.value, entry.userId.value),
    );
  }

  // Higher score wins; ties broken by faster time
  private rankEntries(entries: ScoreEntry[]): ScoreEntry[] {
    const sorted = [...entries].sort((a, b) => {
      if (b.score.value !== a.score.value) return b.score.value - a.score.value;
      return a.timeSeconds.value - b.timeSeconds.value;
    });

    return sorted.map((entry, index) =>
      entry.withRank(new Rank(index + 1)),
    );
  }
}
