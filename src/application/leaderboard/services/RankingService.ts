import type { ScoreEntry } from '../../../domain/leaderboard/ScoreEntry.js';
import { Rank } from '../../../domain/leaderboard/value-objects/Rank.js';

export class RankingService {
  // Higher score wins; ties broken by faster time
  rank(entries: ReadonlyArray<ScoreEntry>): ScoreEntry[] {
    const sorted = [...entries].sort((a, b) => {
      if (b.score.value !== a.score.value) return b.score.value - a.score.value;
      return a.timeSeconds.value - b.timeSeconds.value;
    });

    return sorted.map((entry, index) => entry.withRank(new Rank(index + 1)));
  }
}
