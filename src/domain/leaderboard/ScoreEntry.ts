import { Entity } from '../shared/Entity.js';
import type { EntryId } from './value-objects/EntryId.js';
import type { LevelId } from './value-objects/LevelId.js';
import type { MoveCount } from './value-objects/MoveCount.js';
import type { Rank } from './value-objects/Rank.js';
import type { Score } from './value-objects/Score.js';
import type { SubmittedAt } from './value-objects/SubmittedAt.js';
import type { TimeSeconds } from './value-objects/TimeSeconds.js';
import type { UserId } from './value-objects/UserId.js';
import type { UsernameSnapshot } from './value-objects/UsernameSnapshot.js';

export interface ScoreEntryProps {
  id: EntryId;
  userId: UserId;
  levelId: LevelId;
  usernameSnapshot: UsernameSnapshot;
  score: Score;
  timeSeconds: TimeSeconds;
  movesCount: MoveCount;
  rank?: Rank;
  submittedAt: SubmittedAt;
}

export class ScoreEntry extends Entity<EntryId> {
  readonly userId: UserId;
  readonly levelId: LevelId;
  readonly usernameSnapshot: UsernameSnapshot;
  readonly score: Score;
  readonly timeSeconds: TimeSeconds;
  readonly movesCount: MoveCount;
  readonly rank: Rank | undefined;
  readonly submittedAt: SubmittedAt;

  private constructor(props: ScoreEntryProps) {
    super(props.id);
    this.userId = props.userId;
    this.levelId = props.levelId;
    this.usernameSnapshot = props.usernameSnapshot;
    this.score = props.score;
    this.timeSeconds = props.timeSeconds;
    this.movesCount = props.movesCount;
    this.rank = props.rank;
    this.submittedAt = props.submittedAt;
  }

  static create(props: ScoreEntryProps): ScoreEntry {
    return new ScoreEntry(props);
  }

  withRank(rank: Rank): ScoreEntry {
    return ScoreEntry.create({ ...this.toProps(), rank });
  }

  private toProps(): ScoreEntryProps {
    const props: ScoreEntryProps = {
      id: this.id,
      userId: this.userId,
      levelId: this.levelId,
      usernameSnapshot: this.usernameSnapshot,
      score: this.score,
      timeSeconds: this.timeSeconds,
      movesCount: this.movesCount,
      submittedAt: this.submittedAt,
    };
    if (this.rank !== undefined) props.rank = this.rank;
    return props;
  }
}
