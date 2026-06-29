# Spec — Leaderboard best-score upsert (Backend)

Date: 2026-06-28
Ticket: `MAZ-172` (M9 — Mandatory Auth & Leaderboard/Progress Fixes; B1)
Source: M9 audit, "backend leaderboard/progress defect #1" (supersedes MAZ-107)
Status: approved. The `@s` scenarios in
`specs/backend-leaderboard-upsert-MAZ-172.feature` are the executable contract for
this slice.

## Purpose

Today the leaderboard **rejects every replay**: `Leaderboard.submitEntry` throws
`DuplicateEntryError` (→ HTTP 422 via `DomainErrorMapper`) whenever the user
already has an entry for that level. There is no "update if better" branch, so
`Score.isHigherThan` is dead code and improved times can never be recorded. Once
login is mandatory (MAZ-179) and players replay levels to improve, every second
win returns 422. This slice turns `submitEntry` into a **best-score upsert**:
replace the user's existing entry only when the new result is strictly better,
otherwise keep the stored best as an idempotent no-op (never an error).

## In scope / Out of scope

- In scope:
  - `Leaderboard.submitEntry` upsert semantics (replace-if-better, else no-op).
  - A domain comparison `ScoreEntry.isBetterThan` (higher `Score`, tiebreak by
    faster `TimeSeconds`) consistent with `Leaderboard.rankEntries`.
  - Removing the duplicate-as-error path; deleting the now-dead
    `DuplicateEntryError`.
  - Re-rank + truncate to `maxEntries` after an accepted improvement.
  - Tests: domain (`Leaderboard.test.ts`), application
    (`SubmitScoreService.test.ts`), infrastructure
    (`PrismaLeaderboardRepository.test.ts`).
- Out of scope:
  - Server-owned ids / server-derived username / empty-board 200 (→ MAZ-173).
  - Client replay UX (→ MAZ-184). Swagger/OpenAPI contract is unchanged
    (status codes and request/response bodies are identical).

## Behavior

`Leaderboard.submitEntry(entry)`:

1. If `entry.levelId` ≠ this leaderboard's level → throw
   `LeaderboardLevelMismatchError` (unchanged).
2. Find the existing entry with the same `userId`.
   - **No existing entry** → append the new entry.
   - **Existing entry, new is strictly better** (`entry.isBetterThan(existing)`)
     → replace it in place.
   - **Existing entry, new is worse or equal** → **return without mutation**
     (idempotent no-op: stored best kept, no re-rank, no `updatedAt` bump, no
     domain event).
3. When the board changed (append or replace): re-rank all entries (higher score
   first, ties broken by faster time), truncate to `maxEntries`, bump
   `updatedAt`, and record one `LeaderboardUpdatedEvent`.

Domain invariant: at most one entry per `userId` per leaderboard — guaranteed in
the aggregate, which keeps the persistence `@@unique([leaderboardId, userId])`
constraint satisfiable.

`ScoreEntry.isBetterThan(other)`:

- `true` when `this.score.isHigherThan(other.score)`.
- `false` when `other.score.isHigherThan(this.score)`.
- otherwise (equal score) → `this.timeSeconds.isFasterThan(other.timeSeconds)`.
- equal score **and** equal/slower time → `false` (so equal is a no-op).

## HTTP contract

- `POST /leaderboard/scores`, bearer auth, `userId` derived from the token.
- Better score: **201** (entry updated).
- Worse/equal score: **201** (idempotent, stored best kept) — **no 422**.
- New user: **201** (entry added).
- Invalid VO payload (negative score, zero time/moves): **422** (unchanged).
- Missing required field: **400** (unchanged).
- No/invalid token: **401** (unchanged).

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (no business rules, no infra/framework imports)
- [x] Repositorios: interfaz adentro (port), implementación afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [x] Invariantes en VO/agregados (no en controllers/services de aplicación)
- [x] Errores de dominio sin semántica HTTP (mapping HTTP solo en `framework`)

Layer impact:

- Domain: `Leaderboard.submitEntry` upsert logic; new `ScoreEntry.isBetterThan`;
  delete `DuplicateEntryError` from `errors/LeaderboardErrors.ts`. The best-score
  rule lives in the aggregate/entity, not in the application service.
- Application: `SubmitScoreService` unchanged in code (it already constructs the
  entry and delegates to the aggregate); only its tests grow.
- Infrastructure: `PrismaLeaderboardRepository.save` unchanged — its
  delete-then-recreate strategy already emits at most one row per user; a test is
  added to pin that the unique constraint is respected.
- Framework: no change. `DomainErrorMapper` still maps any remaining domain error
  to 422; the duplicate path is simply gone.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: replace-if-better, no-op on worse/equal, tiebreak by faster time
  replaces on equal score, no event/`updatedAt` bump on no-op, single entry per
  user, `isBetterThan` truth table.
- Application: better → save with updated entry; worse/equal → save with best
  kept and no throw; new user → entry added.
- Adapter/API: `save` emits exactly one row per `userId` (constraint respected).

Architecture acceptance criteria:

- Given the touched layers, When imports are inspected, Then dependencies point inward only.
- Given boundaries are crossed, When DTOs are inspected, Then they remain simple records/primitives (`SubmitScoreInput` unchanged).
- Given the best-score rule, When implementation is inspected, Then it lives in `Leaderboard`/`ScoreEntry`, not in the controller or service.

## Edge cases

- Equal score and equal time → no-op (idempotent).
- Equal score, faster time → replace.
- Worse score, faster time → no-op (score dominates time).
- Replacement that pushes the board over `maxEntries` → re-rank then truncate.
- First-ever entry for a new user → append + rank 1.
- Level mismatch → still throws `LeaderboardLevelMismatchError`.

## Acceptance criteria (Given/When/Then)

- S1: Given a user already on a level's leaderboard, When they resubmit a better score, Then the entry is updated, re-ranked, and `POST /leaderboard/scores` returns 201 (no 422).
- S2: Given the same user resubmits a worse or equal score, Then the stored best is kept and the call still succeeds (idempotent, no 422, no domain event).
- S3: Given a new user submits, Then a new entry is added and ranking/truncation are correct.
- S4: Given an existing entry and an equal score with a faster time, Then the faster entry replaces the slower one.
- S5: Given `submitEntry`, When a user already has an entry, Then the leaderboard never holds two entries for that user.
- S6: Given the repository persists a leaderboard after a replacement, Then it writes exactly one row for that user (the `@@unique([leaderboardId, userId])` constraint is respected).

## Decisions

- **Comparison lives on `ScoreEntry` (`isBetterThan`), not in the service** —
  keeps the best-score invariant in the domain and reuses `Score.isHigherThan` +
  `TimeSeconds.isFasterThan` (killing the dead code). Discarded: inlining the
  comparison in `Leaderboard.submitEntry` (duplicates `rankEntries` ordering and
  hides it from the entity).
- **Worse/equal resubmit is a silent no-op, not an error** — the ticket reserves
  errors for genuine invalid states; a replay is normal gameplay. Discarded:
  returning a distinct 200/"unchanged" body, which would change the HTTP contract
  and ripple to the client this milestone is trying to stabilize.
- **Delete `DuplicateEntryError`** — after removing the throw it is dead; there is
  no remaining genuine invalid state for it. Discarded: keeping it "just in case"
  (audit explicitly flags it as dead code).
- **Keep `PrismaLeaderboardRepository.save` as delete-then-recreate** — it already
  serializes the aggregate's deduped entries, so the unique constraint can never
  be violated. A unit test pins this rather than changing the adapter.

## Risks / OPEN QUESTIONS

- The repo unit test mocks Prisma (no live DB in `verify`), so it asserts the
  adapter emits one row per user rather than exercising a real Postgres unique
  index. A true DB-level constraint test would need an integration harness
  (out of scope here; noted in the ai-log).
