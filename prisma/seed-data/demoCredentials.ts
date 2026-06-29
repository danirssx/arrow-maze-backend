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
];
