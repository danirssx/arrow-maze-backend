# Spec: Full-catalog QA test user (MAZ-194 — backend)

## Problem

QA needs one stable, documented, non-production account to run through the complete
level catalog (progress, leaderboard submit, refresh-token, sync) without creating many
accounts.

## Chosen policy (team decision — the ticket's open question)

**Normal progression from level 1.** The QA account is seeded **empty** and unlocks
levels by completing them in order, exactly like any user.

### Why (vs. the alternative)

- A **local/dev lock bypass** (unlock-all) would touch the client sequential-locking
  rules (MAZ-191) and risk weakening normal users; the AC explicitly forbids weakening
  normal progression. Normal progression needs **no rule change** — it is purely a
  documented seeded account, so normal users can never be affected.
- It matches the ticket title ("end-to-end level progression"): starting empty exercises
  the real first-completion + unlock path, which a pre-unlocked account could not.

## Scope

- `prisma/seed-data/demoCredentials.ts` — add the `qa_catalog` account (documented,
  non-secret local/dev password) + `QA_FULL_CATALOG_USER_ID` + `QA_PROGRESSION_POLICY`.
- `prisma/seed-data/demoProgress.ts` — extract the existing demo progress/leaderboard
  seed data out of `seed.ts` so tests can assert the QA account starts empty (no seed
  execution). `seed.ts` imports it; seed behaviour is unchanged.
- `README.md` — QA row in the demo-credentials table + a full-catalog QA runbook.
- Seed-data tests.

## Out of Scope

- Any local/dev lock bypass / unlock-all mode.
- Backend enforcement of progression (client-side per MAZ-191).
- Real secrets: the password is a documented non-secret local/dev value only.
