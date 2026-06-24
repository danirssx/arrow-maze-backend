# AI Usage Log: MAZ-154 (CA-001) — Backend: separar errores de dominio puros del mapeo HTTP

## Task / Problem

`DomainError` extendía `AppError` que tiene `httpStatus`, filtrando semántica HTTP al dominio.
Siete VOs de leaderboard (`Score`, `MoveCount`, `TimeSeconds`, `Rank`, `UsernameSnapshot`,
`MaxLeaderboardEntries`) y dos de progress (`LevelScore`, `ProgressVersion`) lanzaban
`throw new Error()` genérico. `SubmitScoreService` duplicaba validaciones de VO para
evitar que esos errores genéricos se convirtieran en respuestas 500 en producción.

Objetivo: jerarquía de dominio pura sin HTTP, mapper en framework, VOs con errores
controlados, servicio sin duplicación.

## Tool and Model

Claude Sonnet 4.6 via Claude Code CLI.

## Prompt Used

User requested starting MAZ-154 (CA-001) following the established team workflow:
spec-partner → planner → human approval → TDD implementer. Spec and Gherkin were
written first, approved by Fernando, then TDD cycles were run in four batches.
User also requested the fix-style PR table documenting changed files.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Used | Wrote `specs/backend-domain-errors-CA-001.spec.md` after reading domain error files, VOs, SubmitScoreService, and errorMiddleware. Identified the 3 root causes and proposed the DomainErrorMapper design. | `specs/backend-domain-errors-CA-001.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Used | Distilled 12 Gherkin scenarios covering all 9 VOs, middleware mapping, structural inspection, and service delegation. | `specs/backend-domain-errors-CA-001.feature` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Four Red-Green-Refactor batches (see Scenario Coverage below). Each batch: wrote failing test → ran to confirm RED → implemented → confirmed GREEN. | tests, commits, PR |
| Judge (`.agents/judge.md`) | Not used | Pending human review post-PR. | N/A |
| Mutation Tester (`.agents/mutation.md`) | Not used | Domain/application code changed — mutation run deferred to post-Judge step per team workflow. | N/A |

## Scenario Coverage (@s ↔ test)

| Scenario | Test | File |
|----------|------|------|
| @s1 — Score rejects negative | `should_throw_invalid_argument_error_when_score_is_negative` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s2 — Score rejects decimal | `should_throw_invalid_argument_error_when_score_is_decimal` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s3 — MoveCount rejects zero | `should_throw_invalid_argument_error_when_move_count_is_zero` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s4 — TimeSeconds rejects zero | `should_throw_invalid_argument_error_when_time_seconds_is_zero` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s5 — Rank rejects zero | `should_throw_invalid_argument_error_when_rank_is_zero` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s6 — UsernameSnapshot rejects empty | `should_throw_invalid_argument_error_when_username_snapshot_is_empty` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s7 — MaxLeaderboardEntries rejects zero | `should_throw_invalid_argument_error_when_max_entries_is_zero` | `tests/domain/leaderboard/Leaderboard.test.ts` |
| @s8 — LevelScore rejects negative score | `should_throw_invalid_argument_error_when_level_score_has_negative_score` | `tests/domain/progress/PlayerProgress.test.ts` |
| @s9 — ProgressVersion rejects negative | `should_throw_invalid_argument_error_when_progress_version_is_negative` | `tests/domain/progress/PlayerProgress.test.ts` |
| @s10 — DomainError → 422 via middleware | `should_return_standard_error_envelope_when_domain_error_is_thrown` | `tests/api/error-handling.test.ts` |
| @s11 — No httpStatus in domain | `should_be_domain_error_but_not_app_error_when_*` + `should_not_expose_http_status_on_*` | `tests/domain/domain-error.test.ts`, `Leaderboard.test.ts`, `PlayerProgress.test.ts` |
| @s12 — SubmitScoreService delegates to VO | `should_throw_invalid_argument_error_when_score_is_negative` | `tests/application/leaderboard/SubmitScoreService.test.ts` |

## TDD Cycles

**Batch 1 — DomainError hierarchy**
- RED: `domain-error.test.ts` updated to assert `not instanceof AppError` and `'httpStatus' in error === false`
- GREEN: `DomainError.ts` now extends `Error` directly; removed `httpStatus`, removed `AppError` import

**Batch 2 — Framework mapper**
- RED: `error-handling.test.ts` — `/throw/domain` returned 500 (domain error no longer caught as AppError)
- GREEN: new `DomainErrorMapper.ts`; `errorMiddleware.ts` now has `instanceof DomainError` branch before `instanceof AppError`

**Batch 3 — 9 VOs**
- RED: new `toThrow(InvalidArgumentError)` assertions in `Leaderboard.test.ts` and `PlayerProgress.test.ts`
- GREEN: 9 VOs import `InvalidArgumentError` and replace `throw new Error()` — `Score`, `MoveCount`, `TimeSeconds`, `Rank`, `UsernameSnapshot`, `MaxLeaderboardEntries`, `LevelScore`, `ProgressVersion`

**Batch 4 — SubmitScoreService**
- RED: service tests updated to expect `InvalidArgumentError` instead of `ValidationError`; added `movesCount` coverage
- GREEN: pre-validation guards removed from `SubmitScoreService` (lines 38-46); service now delegates fully to VOs

**Side-effect fix**: 2 API tests (`register.test.ts`, `getLevel.test.ts`) expected HTTP 400 for `INVALID_ARGUMENT` (old `AppError.httpStatus`). Updated to expect 422, consistent with spec decision #3.

## Result Obtained

**New files:**
- `src/framework/errors/DomainErrorMapper.ts` — maps domain error codes to HTTP status
- `specs/backend-domain-errors-CA-001.spec.md` — Clean Architecture spec with CA contract
- `specs/backend-domain-errors-CA-001.feature` — 12 Gherkin scenarios

**Modified source files:**
- `src/domain/errors/DomainError.ts` — extends `Error` directly, no `httpStatus`, no `AppError`
- `src/framework/errors/errorMiddleware.ts` — added `instanceof DomainError` branch with mapper
- `src/domain/leaderboard/value-objects/Score.ts` — `InvalidArgumentError`
- `src/domain/leaderboard/value-objects/MoveCount.ts` — `InvalidArgumentError`
- `src/domain/leaderboard/value-objects/TimeSeconds.ts` — `InvalidArgumentError`
- `src/domain/leaderboard/value-objects/Rank.ts` — `InvalidArgumentError`
- `src/domain/leaderboard/value-objects/UsernameSnapshot.ts` — `InvalidArgumentError`
- `src/domain/leaderboard/value-objects/MaxLeaderboardEntries.ts` — `InvalidArgumentError`
- `src/domain/progress/value-objects/LevelScore.ts` — `InvalidArgumentError`
- `src/domain/progress/value-objects/ProgressVersion.ts` — `InvalidArgumentError`
- `src/application/leaderboard/use-cases/SubmitScoreService.ts` — pre-validations removed

**Modified test files:**
- `tests/domain/domain-error.test.ts` — new assertions; removed `httpStatus`/`AppError` checks
- `tests/domain/leaderboard/Leaderboard.test.ts` — 8 new VO assertions
- `tests/domain/progress/PlayerProgress.test.ts` — 5 new progress VO assertions
- `tests/application/leaderboard/SubmitScoreService.test.ts` — expects `InvalidArgumentError`; added `movesCount` test
- `tests/api/identity/register.test.ts` — 400 → 422 for `INVALID_ARGUMENT`
- `tests/api/level-catalog/getLevel.test.ts` — 400 → 422 for `INVALID_ARGUMENT`

**Test count:** 350 → 373 (23 new tests)

## Verification

- `npm run verify` — 63 suites, 373 tests passing, build clean

## Team Modifications Pending Human Review

1. **HTTP status for `INVALID_ARGUMENT` changed from 400 → 422** — the spec justifies this (422
   is the correct status for a domain invariant violation; 400 is for malformed requests). Two
   existing API tests were updated to reflect this. Frontend/client consumers must be aware if
   they switch on specific status codes.

2. **`details` removed from `DomainError`** — `AppError` kept `details` for HTTP error context;
   `DomainError` no longer exposes it. The `BusinessRuleViolationError` constructor no longer
   accepts a details argument. No callers in production code passed details to domain errors;
   only the old `domain-error.test.ts` did (now removed from the test).

3. **`SubmitScoreService` removed pre-validations** — the service now trusts VOs completely.
   If a VO invariant changes, it automatically propagates without service-level changes.

## Lessons / Limitations

- The ordering of `instanceof` checks in `errorMiddleware` is critical: `DomainError` must come
  before `AppError` (since they now share only `Error` as base, there's no overlap — but placing
  domain first is safer and clearer for future readers).
- `MaxLeaderboardEntries.DEFAULT` is a static field initialized at class load time. Using
  `InvalidArgumentError` there is safe because the default value (10) is valid and the error
  path is never hit at initialization.
