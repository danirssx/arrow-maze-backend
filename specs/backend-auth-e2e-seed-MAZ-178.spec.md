# Spec — Usable seeded credentials + register→login→authed E2E + runbook (Backend)

Date: 2026-06-29
Ticket: `MAZ-178` (M9 — Mandatory Auth & Leaderboard/Progress Fixes; B7)
Source: M9 audit, "auth defects #5, #6, #9"; supports MAZ-179 end-to-end testing
Status: approved. The `@s` scenarios in `specs/backend-auth-e2e-seed-MAZ-178.feature`
are the executable contract for this slice.

## Purpose

Two gaps block demonstrating and verifying the mandatory-login flow:
1. The three seeded demo users share one hardcoded bcrypt hash (`prisma/seed.ts`)
   whose plaintext is recorded nowhere — nobody can log in as a demo user. The seed
   hash is bcrypt cost 10 while the app hasher uses cost 12 — inconsistent.
2. Every auth API test injects fakes; there is no end-to-end test chaining real JWT
   issuance + bcrypt + the use cases through the router. The critical
   "register → login → authenticated request" path is unverified.

This slice gives the demo users documented, known passwords hashed at cost 12, adds
a real register→login→authed E2E test, and documents the runbook.

## In scope / Out of scope

- In scope:
  - `prisma/seed-data/demoCredentials.ts`: documented per-user demo passwords
    (local/dev only) + the cost-12 constant; `seed.ts` hashes each at cost 12.
  - A real E2E integration test: register → login → `GET /users/me` with the
    returned token → 200; wrong password → 401. Real `RegisterUserUseCase`/
    `LoginUseCase`/`GetCurrentUserUseCase` + `BcryptPasswordHasher`(12) +
    `JwtTokenService` + auth middleware through the real routers, over an in-memory
    `UserRepository` (no live DB needed for `npm run verify`).
  - A test proving each documented demo credential is a valid `RawPassword` and
    round-trips through a cost-12 bcrypt hash/verify.
  - README runbook: env (`DATABASE_URL`, `JWT_SECRET`), Prisma `0_init`
    migrate + seed order, and the demo credentials.
- Out of scope:
  - Any auth behavior change (use cases, JWT, bcrypt, routes are reused as-is).
  - A live-Postgres CI harness (the E2E uses an in-memory repository; the runbook
    documents the real DB path).

## Behavior

- `seed.ts` no longer carries a shared cost-10 hash. It reads
  `DEMO_USER_CREDENTIALS` (id, email, username, password, createdDaysAgo) and stores
  `passwordHash = bcrypt.hash(password, 12)` per user. The passwords are documented,
  non-secret local/dev values.
- The E2E exercises the real chain: `POST /auth/register` (201) → `POST /auth/login`
  (200 + `accessToken`) → `GET /users/me` with `Authorization: Bearer <token>` (200,
  body = `{ userId, email, username, role }`). A login with the wrong password
  returns 401. No fakes for the use cases, hasher, or token service.

## HTTP contract (reused, unchanged)

- `POST /auth/register` → 201 `{ data: { userId } }`.
- `POST /auth/login` → 200 `{ data: { accessToken, userId, username, role } }`; wrong
  password → 401 `UNAUTHORIZED`.
- `GET /users/me` (bearer) → 200 `{ data: { userId, email, username, role } }`;
  missing/invalid token → 401.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (no business rules added — use cases reused)
- [x] Repositorios: interfaz adentro (port), implementación afuera (the E2E in-memory repo is a test double of the `UserRepository` port)
- [x] DTOs simples en fronteras (no boundary change)
- [x] Invariantes en VO/agregados (`RawPassword` length rule reused)
- [x] Errores de dominio sin semántica HTTP (mapping stays in framework)

Layer impact:

- Domain: `no previsto`.
- Application: `no previsto` (use cases + ports reused unchanged).
- Infrastructure: `no previsto` for production (`BcryptPasswordHasher`/`JwtTokenService`
  reused). The seed (a build script, not a layer) stops carrying a stale hash and
  hashes at cost 12.
- Framework: `no previsto` (routers/controllers/middleware reused).
- Seed data: new `prisma/seed-data/demoCredentials.ts` (pure data module).
- Tests: `tests/integration/authFlow.e2e.test.ts`, `tests/seed/demoCredentials.test.ts`.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules
- [ ] Real secrets committed (the demo password is a documented local/dev value)
- [ ] Persistence/Prisma client used outside `src/infrastructure` (the seed is a script that already uses Prisma; the E2E uses an in-memory port double)

Required tests:

- Seed: each documented demo credential is a valid `RawPassword` and a cost-12
  bcrypt hash of it verifies; ids/emails/usernames are unique.
- Adapter/API (E2E): register → login → `GET /users/me` 200; wrong password → 401.

Architecture acceptance criteria:

- Given the seed, When inspected, Then no plaintext-unknown shared hash remains and
  the cost is 12 (consistent with `BcryptPasswordHasher`).
- Given the E2E, When imports are inspected, Then it wires real use cases/JWT/bcrypt
  through the real routers with only persistence substituted by an in-memory port.

## Edge cases

- Wrong password at login → 401 (not 403/500).
- `GET /users/me` without a token → 401.
- Re-running the seed → idempotent (upsert); recomputed hash still verifies.

## Acceptance criteria (Given/When/Then)

- S1: Given the documented demo credentials, When each password is validated, Then it
  is a valid `RawPassword` (≥ 8 chars).
- S2: Given the seed hashing approach (cost 12), When a demo password is hashed and
  verified, Then verify succeeds (the documented credential is loggable).
- S3: Given a fresh in-memory app, When a user registers, Then `POST /auth/register`
  returns 201 with a `userId`.
- S4: Given a registered user, When they log in with the correct password, Then
  `POST /auth/login` returns 200 with an `accessToken`.
- S5: Given the access token, When `GET /users/me` is called with it, Then it returns
  200 with `{ userId, email, username, role }` for that user.
- S6: Given a registered user, When they log in with the wrong password, Then
  `POST /auth/login` returns 401.

## Decisions

- **Extract `DEMO_USER_CREDENTIALS` to a pure `prisma/seed-data/` module.** Makes the
  documented credentials testable without instantiating the seed's Prisma client
  (there is precedent: `tests/seed/authoredLevels.test.ts`). Discarded: keeping the
  passwords inline in `seed.ts` (not importable by a test without DB side effects).
- **Hash demo passwords at seed time (cost 12), not a precomputed constant.** Aligns
  with the app hasher and avoids committing a stale hash; the plaintext is the only
  thing documented, and it is a non-secret local/dev value.
- **The E2E uses an in-memory `UserRepository` test double.** `npm run verify` runs
  without a live Postgres; substituting only persistence keeps the JWT + bcrypt + use
  cases + routers real. The runbook documents the true DB path.

## Risks / OPEN QUESTIONS

- The E2E proves the real chain minus a live DB; a full Postgres-backed run is a
  manual/runbook step. Real bcrypt at cost 12 adds ~0.5s to the E2E (acceptable).
- Demo passwords are intentionally weak/known for local demos; the README states they
  are local/dev only and must never be reused in production.
