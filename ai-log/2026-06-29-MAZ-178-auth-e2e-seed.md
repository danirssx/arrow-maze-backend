# AI Usage Log: MAZ-178 (M9/B7) — Usable seeded credentials + register→login→authed E2E + runbook

## Task / Problem

Two gaps blocked demonstrating/verifying the mandatory-login flow:
1. The three seeded demo users shared one hardcoded bcrypt hash (`prisma/seed.ts`)
   whose plaintext was recorded nowhere — nobody could log in as a demo user. The
   seed hash was bcrypt cost 10 while the app hasher uses cost 12 — inconsistent.
2. Every auth API test injected fakes; there was no end-to-end test chaining real
   JWT issuance + bcrypt + the use cases through the router. The critical
   "register → login → authenticated request" path was unverified.

## Tool and Model

Claude Opus 4.8 via Claude Code CLI.

## Prompt Used

User requested implementing `MAZ-178` following both repository `AGENTS.md` files,
root `MEMORY.md`, `Linear_MCP_Guideline.md`, the worktree flow, AI usage logging,
checks, commit/push/PR, Linear update, and a context review of affected tickets.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Used | Wrote the spec after reading `seed.ts`, `BcryptPasswordHasher`, the identity use cases/ports/routes, `JwtTokenService`, the auth API tests, and the README runbook. Found `/users/me` (MAZ-174) is already on develop and that tests run without a live DB (so the E2E needs an in-memory repo). | `specs/backend-auth-e2e-seed-MAZ-178.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Used | Distilled 6 Gherkin scenarios (`@s1..@s6`): valid demo passwords, cost-12 round-trip, register 201, login 200, `/users/me` 200, wrong password 401. | `specs/backend-auth-e2e-seed-MAZ-178.feature` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red→Green: `tests/seed/demoCredentials.test.ts` (RED: module missing) → `prisma/seed-data/demoCredentials.ts` + `seed.ts` hashes at cost 12; `tests/integration/authFlow.e2e.test.ts` wires the real chain over an in-memory repo. | tests, code, `@s → test` map below |
| Judge (`.agents/judge.md`) | Referenced | Applied the CA checklist in-session: no production `src` change (use cases/JWT/bcrypt reused); the seed is a build script that stops carrying a stale hash; the E2E substitutes only persistence with an in-memory port double; no real secret committed. | CA contract in `specs/backend-auth-e2e-seed-MAZ-178.spec.md` |
| Mutation Tester (`.agents/mutation.md`) | Not used | No new mutable production code: the change is seed data (`prisma/`, outside the Stryker `src/{domain,application}` mutate scope) + tests + README. MAZ-178's DoD has no mutation gate (it is a `type:test` ticket). | N/A |

## Scenario Coverage (@s ↔ test)

| Scenario | Test | File |
|----------|------|------|
| @s1 — demo passwords are valid | `should_define_valid_raw_passwords_for_every_demo_user` | `tests/seed/demoCredentials.test.ts` |
| @s2 — cost-12 round-trip | `should_use_a_bcrypt_cost_of_12_consistent_with_the_app_hasher` + `should_log_in_with_a_cost_12_hash_of_the_documented_password` | `tests/seed/demoCredentials.test.ts` |
| @s3 — register 201 | `should_register_then_login_then_authorize_users_me_with_the_real_chain` (register step) | `tests/integration/authFlow.e2e.test.ts` |
| @s4 — login 200 + token | `should_register_then_login_then_authorize_users_me_with_the_real_chain` (login step) | `tests/integration/authFlow.e2e.test.ts` |
| @s5 — `/users/me` 200 with profile | `should_register_then_login_then_authorize_users_me_with_the_real_chain` (me step) | `tests/integration/authFlow.e2e.test.ts` |
| @s6 — wrong password 401 | `should_reject_login_with_the_wrong_password` | `tests/integration/authFlow.e2e.test.ts` |

## TDD Cycles

**Batch 1 — seed credentials (RED → GREEN)**
- RED: `demoCredentials.test.ts` → module not found.
- GREEN: `prisma/seed-data/demoCredentials.ts` exports `DEMO_USER_CREDENTIALS`
  (documented per-user passwords) + `DEMO_PASSWORD_BCRYPT_COST = 12`; `seed.ts`
  imports it, removes the shared cost-10 hash, and stores
  `bcrypt.hash(password, 12)` per user. 4/4 green (cost-12 round-trip ~1.3s).

**Batch 2 — E2E (GREEN, behavior already in src)**
- `authFlow.e2e.test.ts` builds a real Express app: real `RegisterUserUseCase`/
  `LoginUseCase`/`GetCurrentUserUseCase` + `BcryptPasswordHasher(12)` +
  `JwtTokenService` + auth middleware + the real routers, over an in-memory
  `UserRepository`. register(201) → login(200) → `/users/me`(200) + wrong
  password(401). 2/2 green (~0.45s each with real bcrypt).

## Result Obtained

**New files:**
- `prisma/seed-data/demoCredentials.ts` — documented demo users + cost constant
- `tests/seed/demoCredentials.test.ts` — valid passwords + cost-12 round-trip
- `tests/integration/authFlow.e2e.test.ts` — real register→login→authed E2E
- `specs/backend-auth-e2e-seed-MAZ-178.{spec.md,feature}`

**Modified files:**
- `prisma/seed.ts` — uses `DEMO_USER_CREDENTIALS`, hashes each password at cost 12,
  drops the shared cost-10 hash
- `README.md` — `0_init` baseline note + a "Demo credentials (local/dev only)" table
  and the login runbook

**Unchanged on purpose:** all `src/` production code (use cases, `BcryptPasswordHasher`,
`JwtTokenService`, routers, controllers, auth middleware) — the E2E reuses them.

## Verification

- `npm run verify` — GREEN: lint + typecheck + 72 suites / 460 tests + build (exit 0).

## Team Modifications Pending Human Review

1. **Demo passwords are documented local/dev values** (`prisma/seed-data/demoCredentials.ts`
   + README). They are non-secret by design (to make the demo loggable) and must
   never be reused in production.
2. **Seed bcrypt cost is now 12** (was 10), consistent with `BcryptPasswordHasher`.
   Re-running `npm run db:seed` recomputes the hashes (idempotent upsert).
3. **The E2E substitutes persistence with an in-memory `UserRepository`** so it runs
   under `npm run verify` without a live Postgres. A true Postgres-backed run is the
   documented runbook path (`npm run db:setup`).

## Lessons / Limitations

- Extracting `DEMO_USER_CREDENTIALS` to a pure `prisma/seed-data/` module makes the
  documented credentials testable without instantiating the seed's Prisma client
  (precedent: `tests/seed/authoredLevels.test.ts`).
- The E2E proves the real JWT + bcrypt + use-case + router chain; only the DB is
  substituted. Real bcrypt at cost 12 keeps each E2E case ~0.45s — acceptable.
- `RawPassword` only enforces length ≥ 8 (no complexity rule), so the demo passwords
  just need to be ≥ 8 chars.
