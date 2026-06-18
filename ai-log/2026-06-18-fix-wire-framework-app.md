# AI Log — fix: Wire Leaderboard and Progress routes in app.ts

**Date:** 2026-06-18
**Branch:** fix/wire-framework-app

## Task / problem

Deep review revealed that `src/framework/app.ts` only wired the Identity bounded context. The Leaderboard and Progress bounded contexts had complete framework and application layers (controllers, routes, use cases, repositories) that were never mounted. No concrete `DomainEventBus` implementation existed, so any use case requiring it could not be instantiated.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

Continuation of critical bug fix session. User granted one-time merge permission for fix PRs.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Referenced | Read all constructors before touching app.ts | GetLeaderboardService, SubmitScoreService, LoadProgressService, authMiddleware |
| TDD Implementer | Not used | No new logic introduced | — |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `src/infrastructure/events/InMemoryEventBus.ts`: concrete `DomainEventBus` implementation that logs published events via the `Logger` port
- `src/framework/app.ts`: wired `PgProgressRepository`, `PgLeaderboardRepository`, `InMemoryEventBus`, `LoadProgressService`, `CompleteLevelService`, `SyncProgressService`, `GetLeaderboardService`, `SubmitScoreService`, `ProgressController`, `LeaderboardController`, `createAuthMiddleware`, `createProgressRouter`, `createLeaderboardRouter`
- All 277 tests pass, `tsc --noEmit` clean

## Team modifications pending human review

- `InMemoryEventBus` only logs events — no subscribers. This is intentional: no event handler infrastructure exists yet. When the team adds handlers, they should inject them into this bus or replace it with a proper dispatcher.
- Level Catalog has no framework layer yet (no `LevelController` / routes). Left unwired — there is no corresponding ticket for the HTTP API at this stage.

## Lessons / limitations

- A missing `DomainEventBus` implementation is a silent runtime failure: TypeScript compiles fine, but any use case that calls `eventBus.publishAll()` would throw at startup when the dependency is injected. Always wire concrete infrastructure before registering routes.
