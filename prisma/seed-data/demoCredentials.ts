/**
 * Demo user credentials for the seeded LOCAL / DEV database.
 *
 * These passwords are NOT secrets: they exist only so the mandatory-login flow can
 * be demonstrated and tested against a freshly seeded database. They must never be
 * reused in production. `seed.ts` hashes each password at `DEMO_PASSWORD_BCRYPT_COST`
 * (12 — consistent with `BcryptPasswordHasher`) and stores the hash; the plaintext
 * here is the documented credential a developer logs in with.
 *
 * The list is the single source of truth for the demo users (id/email/username),
 * so the seed and the credential tests cannot drift.
 */

export type DemoCredential = {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly createdDaysAgo: number;
};

export const DEMO_PASSWORD_BCRYPT_COST = 12;

/**
 * Dedicated QA account for end-to-end full-catalog level progression (MAZ-194).
 *
 * `QA_PROGRESSION_POLICY` records the team's decision for the ticket's open question:
 * the QA account follows NORMAL progression from level 1 (it starts with no completed
 * levels and unlocks levels by playing them in order, exactly like any user). It does
 * NOT bypass locks, so normal users' progression rules are never weakened. The
 * credential below is a documented, non-secret local/dev value, seeded like the other
 * demo users.
 */
export const QA_FULL_CATALOG_USER_ID = "660e8400-e29b-41d4-a716-446655440004";
export const QA_PROGRESSION_POLICY = "normal-progression" as const;

export const DEMO_USER_CREDENTIALS: readonly DemoCredential[] = [
  {
    id: "660e8400-e29b-41d4-a716-446655440001",
    email: "demo@arrowmaze.test",
    username: "demo_player",
    password: "ArrowDemo!Player",
    createdDaysAgo: 6,
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440002",
    email: "mika@arrowmaze.test",
    username: "mika_arrows",
    password: "ArrowDemo!Mika",
    createdDaysAgo: 5,
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440003",
    email: "noah@arrowmaze.test",
    username: "noah_escape",
    password: "ArrowDemo!Noah",
    createdDaysAgo: 4,
  },
  {
    // MAZ-194 — QA full-catalog account (normal progression, starts empty).
    id: QA_FULL_CATALOG_USER_ID,
    email: "qa@arrowmaze.test",
    username: "qa_catalog",
    password: "ArrowDemo!QaCatalog",
    createdDaysAgo: 7,
  },
];
