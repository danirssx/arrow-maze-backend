import type { DailyChallengeDto } from "../DailyChallengeTypes.js";

export type DailyChallengeCacheRecord = {
  readonly challenge: DailyChallengeDto;
};

export interface DailyChallengeCacheRepository {
  findByDate(date: string): Promise<DailyChallengeCacheRecord | null>;
  save(record: DailyChallengeCacheRecord): Promise<void>;
}
