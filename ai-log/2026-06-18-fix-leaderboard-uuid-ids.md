# AI Log — fix: LeaderboardId and EntryId UUID validation

**Date:** 2026-06-18
**Branch:** fix/leaderboard-uuid-ids

## Task / problem

`LeaderboardId` and `EntryId` had public constructors that accepted any non-empty string. The `SubmitScoreService` passed client-provided `leaderboardId` and `entryId` strings directly via `new LeaderboardId(...)` / `new EntryId(...)`. The DB schema defines both columns as `UUID PRIMARY KEY`, so any non-UUID string causes `invalid input syntax for type uuid` in production.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

Continuation of critical bug fix session.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Referenced | Read migration 002 to confirm UUID PK before touching code | 002_create_leaderboards.sql |
| TDD Implementer | Referenced | Tests updated alongside each production file; all 277 pass | tests/domain/leaderboard/, tests/infrastructure/leaderboard/, tests/application/leaderboard/ |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `LeaderboardId`: private constructor, UUID v4 validation, `create()` + `generate()` static factories, `InvalidArgumentError`
- `EntryId`: same pattern as above
- `PgLeaderboardRepository`: `new LeaderboardId(...)` → `LeaderboardId.create(...)`, `new EntryId(...)` → `EntryId.create(...)`
- `SubmitScoreService`: same factory replacements; client must now supply valid UUIDs for `leaderboardId` and `entryId`
- All test fixtures updated to use valid UUID constants
- All 277 tests pass, `tsc --noEmit` clean

## Team modifications pending human review

- `SubmitScoreService` still accepts `leaderboardId` and `entryId` from HTTP body (Fix #8). After this fix, invalid UUIDs will throw `InvalidArgumentError` at the VO level instead of reaching the DB — an improvement, but the architecture concern (client-generated IDs) remains for a future ticket.

## Lessons / limitations

- Same root cause as the Progress UUID fix: VOs must enforce UUID format in their constructor, not rely on DB constraints, because pool mocks accept any string in tests.
