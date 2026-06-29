# AI Usage Log: MAZ-172 (M9/B1) — Backend: leaderboard best-score upsert (stop rejecting replays 422)

## Task / Problem

The leaderboard **rejected every replay**. `Leaderboard.submitEntry` threw
`DuplicateEntryError` whenever the user already had an entry for the level, which
`DomainErrorMapper` maps to HTTP 422. There was no "update if better" branch, so
`Score.isHigherThan` was dead code and improved times could never be recorded.
The DB constraint `@@unique([leaderboardId, userId])` enforces one entry per user,
so the fix had to be an upsert, not a second insert. Once login becomes mandatory
(MAZ-179) and players replay levels to improve, every second win would 422.

Goal: turn `submitEntry` into a best-score upsert — replace the user's stored
entry only when the new result is strictly better; otherwise keep the best as an
idempotent no-op (never an error). Re-rank + truncate after an accepted
improvement. Remove the duplicate-as-error path.

## Tool and Model

Claude Opus 4.8 via Claude Code CLI.

## Prompt Used

User requested starting MAZ-172 following the established team workflow (read both
`AGENTS.md`, root `MEMORY.md`, `Linear_MCP_Guideline.md`, the M9 memory; new
worktree; spec → Gherkin → TDD; ai-log + compile usage; commit/push/PR; update
Linear), noting it is a refactor so all affected tickets/context must be reviewed.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Used | Wrote the spec after reading `Leaderboard`, `ScoreEntry`, `Score`/`TimeSeconds` VOs, `SubmitScoreService`, `PrismaLeaderboardRepository`, `DomainErrorMapper`, and the existing tests. Captured the root cause, the upsert decision, and the CA contract. | `specs/backend-leaderboard-upsert-MAZ-172.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Used | Distilled 9 Gherkin scenarios (`@s1..@s9`) covering replace-if-better, no-op on worse/equal, faster-time tiebreak, ranking/truncation, single-entry-per-user, service-level upsert, and the persistence unique-constraint guarantee. | `specs/backend-leaderboard-upsert-MAZ-172.feature` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red→Green→Refactor: wrote 13 failing domain tests (confirmed RED), implemented `ScoreEntry.isBetterThan` + the upsert in `Leaderboard.submitEntry` (GREEN), then refactored the replace step from `findIndex`/index-assign to `find`/`filter` to remove a dead `undefined` branch. Added application + infra tests. | tests, code, commit, `@s → test` map below |
| Judge (`.agents/judge.md`) | Referenced | Applied the `docs/reglas_clean_arch.md` checklist within this session (dependency rule, domain purity, invariants in aggregate/entity, no HTTP semantics in domain). No separate adversarial judge session was run. | CA contract in `specs/backend-leaderboard-upsert-MAZ-172.spec.md` |
| Mutation Tester (`.agents/mutation.md`) | Used | Ran `stryker` scoped to the two changed domain files. First run: 90.74% with 2 survivors on the new `filter((e) => e !== existing)` predicate (single-user tests couldn't distinguish "remove old" from "remove all"). Added `should_keep_other_users_entries_when_one_user_improves`; re-run: `Leaderboard.ts` 100%. | scores below |

## Scenario Coverage (@s ↔ test)

| Scenario | Test | File |
|----------|------|------|
| @s1 — better resubmission replaces | `should_replace_entry_when_resubmitted_score_is_better` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s2 — worse resubmission no-op | `should_keep_existing_entry_when_resubmitted_score_is_worse` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s3 — equal resubmission no-op | `should_keep_existing_entry_when_resubmitted_score_and_time_are_equal` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s4 — equal score, faster time replaces | `should_replace_entry_when_same_score_but_faster_time` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s5 — new user added + ranked/truncated | `should_limit_entries_when_max_capacity_reached` (existing) + `should_keep_other_users_entries_when_one_user_improves` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s6 — single entry per user | `should_keep_single_entry_per_user_when_resubmitted` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s7 — service accepts better resubmission | `should_save_updated_entry_when_better_score_resubmitted` | `tests/application/leaderboard/SubmitScoreService.test.ts` |
| @s8 — service accepts worse resubmission without throwing | `should_save_without_throwing_when_worse_score_resubmitted` | `tests/application/leaderboard/SubmitScoreService.test.ts` |
| @s9 — repo persists one row per user | `should_persist_a_single_row_per_user_when_entry_replaced` | `tests/infrastructure/leaderboard/PrismaLeaderboardRepository.test.ts` |
| (support) `isBetterThan` truth table | `ScoreEntry.isBetterThan` describe block (5 tests) | `tests/domain/leaderboard/Leaderboard.test.ts` |

## TDD Cycles

**Batch 1 — domain upsert (RED → GREEN)**
- RED: removed the `DuplicateEntryError` test, added 8 upsert tests + a 5-test
  `isBetterThan` describe. `npx jest` → 13 failed (`isBetterThan is not a function`).
- GREEN: added `ScoreEntry.isBetterThan` (higher score wins, tiebreak by faster
  time — reuses `Score.isHigherThan` + `TimeSeconds.isFasterThan`); rewrote
  `Leaderboard.submitEntry` to upsert (replace-if-better, else no-op); deleted the
  now-dead `DuplicateEntryError` class and its import. 47/47 green.

**Batch 2 — application + infra (RED → GREEN)**
- Added `SubmitScoreService` tests for better/worse resubmission and a
  `PrismaLeaderboardRepository` test asserting `createMany` emits exactly one row
  per user after a replacement (unique constraint respected). 79/79 leaderboard.

**Batch 3 — refactor + mutation hardening**
- Refactored the replace step (`find`/`filter`, no dead branch, no non-null
  assertion). Mutation surfaced 2 survivors on the `filter` predicate; added a
  multi-user "one improves, others kept" test. `Leaderboard.ts` → 100%.

## Result Obtained

**New files:**
- `specs/backend-leaderboard-upsert-MAZ-172.spec.md` — CA spec + contract
- `specs/backend-leaderboard-upsert-MAZ-172.feature` — 9 Gherkin scenarios

**Modified source files:**
- `src/domain/leaderboard/Leaderboard.ts` — `submitEntry` is now a best-score
  upsert; removed the duplicate-as-error path and `DuplicateEntryError` import
- `src/domain/leaderboard/ScoreEntry.ts` — new `isBetterThan(other)` (kills the
  dead `Score.isHigherThan`)
- `src/domain/leaderboard/errors/LeaderboardErrors.ts` — deleted `DuplicateEntryError`

**Modified test files:**
- `tests/domain/leaderboard/Leaderboard.test.ts` — upsert + `isBetterThan` tests
- `tests/application/leaderboard/SubmitScoreService.test.ts` — service upsert tests
- `tests/infrastructure/leaderboard/PrismaLeaderboardRepository.test.ts` —
  single-row-per-user constraint test

**Unchanged on purpose:** `SubmitScoreService` (already constructs the entry and
delegates to the aggregate — the rule belongs in the domain), `PrismaLeaderboardRepository.save`
(delete-then-recreate already serializes the deduped aggregate), `DomainErrorMapper`,
`LeaderboardController`, and the OpenAPI/Swagger contract (status codes and bodies
are identical: better/worse/new all return 201; VO violations still 422).

## Verification

- `npm run verify` — GREEN: lint + typecheck + coverage (63 suites / 418 tests) + build (exit 0).
- Scoped mutation (`stryker --mutate src/domain/leaderboard/{Leaderboard,ScoreEntry}.ts`):
  90.74% overall, above the 80% break threshold. `Leaderboard.ts` reached 100%
  after the multi-user test. The 3 remaining `ScoreEntry.ts` survivors are all on
  the pre-existing `toProps()` `if (this.rank !== undefined)` line (out of scope
  for this ticket; not touched by MAZ-172).

## Team Modifications Pending Human Review

1. **HTTP behavior change:** a worse/equal replay now returns **201** instead of
   **422**. This is the intended fix and unblocks MAZ-184 (client replay UX); any
   client that switched on the old 422 must be updated (the client currently
   swallows the 422, so this is strictly safer).
2. **`DuplicateEntryError` deleted.** It was dead after removing the throw and had
   no genuine invalid-state caller. If a future ticket needs a true "duplicate"
   error semantics, reintroduce it explicitly.
3. **Idempotent no-op still calls `repo.save`.** A worse/equal resubmission
   persists the (unchanged) aggregate rather than short-circuiting. Kept for
   simplicity and because the save is a harmless re-serialization of the same
   best; a future optimization could skip the write when nothing changed.

## Lessons / Limitations

- The `PrismaLeaderboardRepository` test mocks Prisma (no live Postgres in
  `verify`), so it pins that the adapter emits exactly one row per user rather than
  exercising a real unique index. A true DB-level constraint test would need an
  integration harness (out of scope here).
- Mutation caught a real gap: with a single user on the board, "remove the old
  entry" and "remove all entries then re-push the new one" are observationally
  identical. Only a multi-user scenario distinguishes them — a good reminder that
  per-user logic needs multi-user tests.
