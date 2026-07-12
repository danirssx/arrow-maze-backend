# AI Usage Log - MAZ-224 Admin Manual Daily Challenge Iteration (Implementation)

## Task / Problem

Implement the approved MAZ-224 contract: an admin-only manual Daily Challenge iteration
flow that re-generates the challenge for a UTC date, replaces the cached challenge only
after a candidate fully validates, and exposes a sanitized, pollable operation log for the
admin dashboard. The executable `.feature` (`@s1..@s12`) was approved by the human and the
planning PR (#83) was merged to `develop` before this slice started.

## Tool and Model

- Tool: Claude Code
- Model: Claude Opus 4.8 (1M context)
- Date: 2026-07-11
- Repository: `arrow-maze-backend`
- Worktree: `worktrees/am-MAZ-224-backend-impl`, branch
  `feat/backend-daily-challenge-iteration-MAZ-224` off `origin/develop`.

## Prompt Used

The user asked to work on MAZ-224 following the repo rules: read backend/client `AGENTS.md`,
root `MEMORY.md`, `Linear_MCP_Guideline.md`; work in a new worktree; register AI usage and
validate checks; review whether `MEMORY.md`/`AGENTS.md` need updates; commit, push, open a PR,
and update Linear; and, because it is a factorization, review all affected tickets.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Not used | The spec was authored and approved in the MAZ-224 planning slice (PR #83); no new spec debate happened here. | `specs/backend-daily-challenge-manual-iteration-MAZ-224.spec.md` (pre-existing) |
| Planner / Gherkin Author (`.agents/planner.md`) | Not used | The `.feature` contract (`@s1..@s12`) was already approved before implementation. | `specs/backend-daily-challenge-manual-iteration-MAZ-224.feature` (pre-existing) |
| TDD Implementer (`.agents/tdd-implementer.md`) | Referenced | Followed the Three Laws / red-green discipline in this session: each layer got its tests, run per module (application → infrastructure → API → architecture), before the full `verify` gate. No separate agent session was spawned. | tests below + `@s → test` map |
| Judge (`.agents/judge.md`) | Referenced | Applied the judge's review lens (Clean Architecture boundaries, DTO/secret leakage, HTTP mapping in framework only) while writing `tests/architecture/dailyChallengeIterationBoundary.test.ts` and the controller/route split. | `tests/architecture/dailyChallengeIterationBoundary.test.ts` |
| Mutation Tester (`.agents/mutation.md`) | Used | Ran scoped Stryker on the new application logic; two surviving default-message mutants were killed by adding message assertions. | `reports/mutation/index.html`, `ai-log/2026-07-11-MAZ-224-mutation.md` |

## Result Obtained

New application layer:

- `DailyChallengeGeneration.ts` — extracted the MAZ-218 context builder + provider-candidate
  validator into a shared, framework-free module (single source of truth for the
  Gemini/fallback validation pipeline). `GetDailyChallengeUseCase` now delegates to it; its 23
  existing tests stay green.
- `DailyChallengeIterationTypes.ts`, `DailyChallengeIterationErrors.ts`.
- Ports `DailyChallengeIterationRepository`, `IterationTaskScheduler`.
- `StartDailyChallengeIterationUseCase` (validate date → reject concurrent op → persist RUNNING
  + REQUESTED → schedule the Gemini/fallback pipeline → replace cache only after validation →
  terminal SUCCEEDED/FAILED with a sanitized event log) and `GetDailyChallengeIterationUseCase`.

New infrastructure:

- `PrismaDailyChallengeIterationRepository` + `DailyChallengeIteration` Prisma model and
  migration `20260711000000_add_daily_challenge_iterations`.
- `ImmediateIterationTaskScheduler` (defers the pipeline via `setImmediate` so the start
  request returns the RUNNING snapshot).

New framework:

- `AdminDailyChallengeIterationController` + `adminDailyChallengeIterationRoutes` guarded by
  `authMiddleware` + `requireAdmin`; wired in `app.ts`; OpenAPI paths/schemas + README updated.

### `@s → test` map

- `@s1` → `StartDailyChallengeIterationUseCase.test.ts`:
  `should_return_running_operation_with_requested_event_when_admin_starts_for_today`,
  `should_store_validated_challenge_for_today_after_pipeline_runs`;
  `adminDailyChallengeIteration.test.ts`: `should_return_202_with_running_operation_when_admin_starts`.
- `@s2` → `should_replace_existing_challenge_atomically_only_after_success`.
- `@s3` → `should_log_gemini_source_without_secrets_when_generation_succeeds`.
- `@s4` → `should_fall_back_and_log_fallback_usage_when_gemini_candidate_is_invalid`.
- `@s5` → `should_fail_and_preserve_previous_challenge_when_both_generators_fail`.
- `@s6` → `adminDailyChallengeIteration.test.ts`: `should_return_401_and_not_start_when_unauthenticated`,
  `should_return_401_and_not_read_when_polling_without_auth`.
- `@s7` → `should_return_403_and_not_start_when_authenticated_user_is_not_admin`.
- `@s8` → `GetDailyChallengeIterationUseCase.test.ts` (both);
  `adminDailyChallengeIteration.test.ts`: `should_return_200_with_ordered_events_when_admin_polls_operation`,
  `should_return_404_when_polling_unknown_operation`.
- `@s9` → `should_reject_duplicate_running_iteration_for_same_date`;
  `adminDailyChallengeIteration.test.ts`: `should_return_409_with_running_operation_when_iteration_already_in_progress`.
- `@s10` → `should_reject_malformed_date_with_format_message_before_calling_any_generator`,
  `should_reject_calendar_invalid_date_with_format_message`;
  `adminDailyChallengeIteration.test.ts`: `should_return_400_when_date_is_invalid`,
  `should_return_400_with_default_message_when_date_is_not_a_string`.
- `@s11` → `should_reject_future_date_with_future_message_before_calling_any_generator`,
  `should_accept_today_and_reject_the_next_utc_day_at_the_boundary`.
- `@s12` → `tests/architecture/dailyChallengeIterationBoundary.test.ts` (3 tests).

### Validation

- `npm run verify` GREEN: 106 suites / 675 tests, lint + typecheck + coverage + build.
- New application logic coverage: use cases 98-100%, errors 100%.
- Scoped Stryker mutation on the new application files: score recorded in
  `ai-log/2026-07-11-MAZ-224-mutation.md` (≥ break threshold 80).

## Affected Tickets Reviewed

- `MAZ-218`: daily challenge base (generation/cache/validation). MAZ-224 reuses its
  Gemini/fallback + `LevelSolvabilityPolicy` pipeline via the extracted
  `DailyChallengeGeneration` module; its tests remain green after the extraction.
- `MAZ-195`: admin route guard (`authMiddleware` + `requireAdmin`) reused for the two new
  admin endpoints.
- `MAZ-143`: Prisma-only infrastructure; the new operation store follows the same
  `getClient` + `InfrastructureError` conventions and adds a Prisma Migrate migration.
- `MAZ-223`: admin dashboard follow-up (manual iteration button + live log) is now unblocked
  by these backend endpoints.
- `MAZ-219`: mobile daily challenge consumer is unaffected; the public `GET /daily-challenge`
  shape is unchanged.

## Team Modifications Pending Human Review

- Domain/application tests are subject to mandatory human review (AGENTS §5).
- Confirm the synchronous-in-request vs deferred (`setImmediate`) generation timing is
  acceptable for the admin UX; the scheduler port keeps this swappable.
- Apply the new Prisma migration (`db:migrate`) before deploying.

## Lessons / Limitations

- The `IterationTaskScheduler` port keeps the RUNNING→poll→terminal contract honest and fully
  deterministic under test (a manual scheduler lets tests assert RUNNING before running the
  pipeline and terminal after) without introducing background-timer flakiness.
- Stryker `--mutate` treats each value as a glob relative to repo root: an exact file path
  under a subdirectory must include the full path (`.../use-cases/...`), otherwise Stryker
  silently reports "no files" and a misleading `n/a` score. Always confirm the mutant count is
  non-zero.
- Mutation testing caught two surviving default error-message literals; those messages are
  observable in `400`/`404` responses, so they were pinned with message assertions.
