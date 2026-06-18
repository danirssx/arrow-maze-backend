import { Entity } from '../shared/Entity.js';
import { LeaderboardUpdatedEvent } from './events/LeaderboardUpdatedEvent.js';
import { DuplicateEntryError, LeaderboardLevelMismatchError } from './errors/LeaderboardErrors.js';
import type { ScoreEntry } from './ScoreEntry.js';
import type { LeaderboardId } from './value-objects/LeaderboardId.js';
import type { LevelId } from './value-objects/LevelId.js';
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

  submitEntry(entry: ScoreEntry): void {
    if (!entry.levelId.equals(this.levelId)) {
      throw new LeaderboardLevelMismatchError(entry.levelId.value, this.levelId.value);
    }

    const alreadySubmitted = this._entries.some((e) =>
      e.userId.equals(entry.userId),
    );
    if (alreadySubmitted) {
      throw new DuplicateEntryError(entry.userId.value);
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
