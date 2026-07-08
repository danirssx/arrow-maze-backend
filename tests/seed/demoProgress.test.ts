import { DEMO_PROGRESS, DEMO_LEADERBOARDS } from "../../prisma/seed-data/demoProgress.js";
import { DEMO_USER_CREDENTIALS, QA_FULL_CATALOG_USER_ID } from "../../prisma/seed-data/demoCredentials.js";

// Subject to human review — seed-data contract test (MAZ-194)

const KNOWN_USER_IDS = new Set(DEMO_USER_CREDENTIALS.map((credential) => credential.id));

function leaderboardUserIds(): string[] {
  return DEMO_LEADERBOARDS.flatMap((board) => board.entries.map((entry) => entry.userId));
}

describe("demo seed progress data", () => {
  it("should_reference_only_known_demo_users_in_seeded_progress_and_leaderboards", () => {
    expect(KNOWN_USER_IDS.has(DEMO_PROGRESS.userId)).toBe(true);
    for (const userId of leaderboardUserIds()) {
      expect(KNOWN_USER_IDS.has(userId)).toBe(true);
    }
  });

  it("should_start_the_qa_account_with_no_seeded_progress_normal_progression", () => {
    // The chosen QA policy is normal progression: the account is seeded empty and must
    // unlock levels by playing them, so it must not appear in seeded completions.
    expect(DEMO_PROGRESS.userId).not.toBe(QA_FULL_CATALOG_USER_ID);
    expect(leaderboardUserIds()).not.toContain(QA_FULL_CATALOG_USER_ID);
  });

  it("should_use_unique_completed_level_ids_in_the_demo_progress", () => {
    const levelIds = DEMO_PROGRESS.completedLevels.map((level) => level.levelId);
    expect(new Set(levelIds).size).toBe(levelIds.length);
  });
});
