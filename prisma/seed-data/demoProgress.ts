/**
 * Demo progress + leaderboard seed data for the LOCAL / DEV database.
 *
 * Extracted from `seed.ts` (MAZ-194) so it can be validated by tests without
 * executing the seed. It reproduces the former demo state: `demo_player` has
 * completed the first three levels and the first three levels have leaderboards.
 *
 * The QA full-catalog account (`QA_FULL_CATALOG_USER_ID`) is intentionally absent:
 * its chosen policy is normal progression, so it starts empty and unlocks levels by
 * playing them.
 */

export type DemoCompletedLevel = {
  readonly id: string;
  readonly levelId: string;
  readonly bestScore: number;
  readonly bestTimeSeconds: number;
  readonly bestMovesCount: number;
  readonly completedDaysAgo: number;
};

export type DemoProgress = {
  readonly id: string;
  readonly userId: string;
  readonly version: number;
  readonly completedLevels: readonly DemoCompletedLevel[];
};

export type DemoLeaderboardEntry = {
  readonly id: string;
  readonly userId: string;
  readonly usernameSnapshot: string;
  readonly score: number;
  readonly timeSeconds: number;
  readonly movesCount: number;
  readonly rank: number;
  readonly submittedDaysAgo: number;
};

export type DemoLeaderboard = {
  readonly id: string;
  readonly levelId: string;
  readonly entries: readonly DemoLeaderboardEntry[];
};

export const DEMO_PROGRESS: DemoProgress = {
  id: "770e8400-e29b-41d4-a716-446655440001",
  userId: "660e8400-e29b-41d4-a716-446655440001",
  version: 3,
  completedLevels: [
    { id: "880e8400-e29b-41d4-a716-446655440001", levelId: "550e8400-e29b-41d4-a716-446655440010", bestScore: 980, bestTimeSeconds: 18, bestMovesCount: 4, completedDaysAgo: 3 },
    { id: "880e8400-e29b-41d4-a716-446655440002", levelId: "550e8400-e29b-41d4-a716-446655440011", bestScore: 920, bestTimeSeconds: 35, bestMovesCount: 7, completedDaysAgo: 2 },
    { id: "880e8400-e29b-41d4-a716-446655440003", levelId: "550e8400-e29b-41d4-a716-446655440012", bestScore: 860, bestTimeSeconds: 62, bestMovesCount: 10, completedDaysAgo: 1 },
  ],
};

export const DEMO_LEADERBOARDS: readonly DemoLeaderboard[] = [
  {
    id: "990e8400-e29b-41d4-a716-446655440010",
    levelId: "550e8400-e29b-41d4-a716-446655440010",
    entries: [
      { id: "aa0e8400-e29b-41d4-a716-446655440101", userId: "660e8400-e29b-41d4-a716-446655440001", usernameSnapshot: "demo_player", score: 980, timeSeconds: 18, movesCount: 4, rank: 1, submittedDaysAgo: 3 },
      { id: "aa0e8400-e29b-41d4-a716-446655440102", userId: "660e8400-e29b-41d4-a716-446655440002", usernameSnapshot: "mika_arrows", score: 940, timeSeconds: 22, movesCount: 5, rank: 2, submittedDaysAgo: 2 },
      { id: "aa0e8400-e29b-41d4-a716-446655440103", userId: "660e8400-e29b-41d4-a716-446655440003", usernameSnapshot: "noah_escape", score: 900, timeSeconds: 31, movesCount: 6, rank: 3, submittedDaysAgo: 1 },
    ],
  },
  {
    id: "990e8400-e29b-41d4-a716-446655440011",
    levelId: "550e8400-e29b-41d4-a716-446655440011",
    entries: [
      { id: "aa0e8400-e29b-41d4-a716-446655440111", userId: "660e8400-e29b-41d4-a716-446655440002", usernameSnapshot: "mika_arrows", score: 960, timeSeconds: 29, movesCount: 6, rank: 1, submittedDaysAgo: 3 },
      { id: "aa0e8400-e29b-41d4-a716-446655440112", userId: "660e8400-e29b-41d4-a716-446655440001", usernameSnapshot: "demo_player", score: 920, timeSeconds: 35, movesCount: 7, rank: 2, submittedDaysAgo: 2 },
      { id: "aa0e8400-e29b-41d4-a716-446655440113", userId: "660e8400-e29b-41d4-a716-446655440003", usernameSnapshot: "noah_escape", score: 870, timeSeconds: 47, movesCount: 9, rank: 3, submittedDaysAgo: 1 },
    ],
  },
  {
    id: "990e8400-e29b-41d4-a716-446655440012",
    levelId: "550e8400-e29b-41d4-a716-446655440012",
    entries: [
      { id: "aa0e8400-e29b-41d4-a716-446655440121", userId: "660e8400-e29b-41d4-a716-446655440003", usernameSnapshot: "noah_escape", score: 910, timeSeconds: 55, movesCount: 9, rank: 1, submittedDaysAgo: 3 },
      { id: "aa0e8400-e29b-41d4-a716-446655440122", userId: "660e8400-e29b-41d4-a716-446655440001", usernameSnapshot: "demo_player", score: 860, timeSeconds: 62, movesCount: 10, rank: 2, submittedDaysAgo: 2 },
      { id: "aa0e8400-e29b-41d4-a716-446655440123", userId: "660e8400-e29b-41d4-a716-446655440002", usernameSnapshot: "mika_arrows", score: 800, timeSeconds: 78, movesCount: 12, rank: 3, submittedDaysAgo: 1 },
    ],
  },
];
