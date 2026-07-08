# Spec: Full-catalog QA test user (MAZ-194 - backend)

## Problem

QA needs one stable, documented, non-production account to run through the complete
level catalog (progress, leaderboard submit, refresh-token, sync) without creating many
accounts.

## Chosen Policy

**Normal progression from level 1.** The QA account is seeded empty and unlocks levels
by completing them in order, exactly like any `USER`.

### Why

- A local/dev lock bypass would touch the client sequential-locking rules (MAZ-191) and
  risk weakening normal users. Normal progression needs no rule change.
- Starting empty exercises the real first-completion and unlock path a pre-unlocked
  account would not cover.
- MAZ-199 already owns the local/dev `ADMIN` demo account and all-level admin progress;
  MAZ-194 remains a separate normal-user QA path.

## Scope

- `prisma/seed-data/demoCredentials.ts` - add the `qa_catalog` account (documented,
  non-secret local/dev password) plus `QA_FULL_CATALOG_USER_ID` and
  `QA_PROGRESSION_POLICY`.
- `prisma/seed-data/demoProgress.ts` - extract demo progress/leaderboard seed data out
  of `seed.ts` so tests can assert the QA account starts empty without executing the DB
  seed. `seed.ts` imports it; seed behavior is unchanged.
- `README.md` - QA row in the demo credentials table and a full-catalog QA runbook.
- Seed-data tests.

## Out of Scope

- Any local/dev lock bypass or unlock-all mode.
- Backend enforcement of progression.
- Real secrets: the password is a documented non-secret local/dev value only.
