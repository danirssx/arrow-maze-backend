# AI Log — fix: wire UnitOfWork transactions to repositories via AsyncLocalStorage

**Date:** 2026-06-18
**Branch:** fix/unit-of-work-transactional-client

## Task / problem

`PgUnitOfWork.runInTransaction` acquired a dedicated `PoolClient` and ran `BEGIN`/`COMMIT` on it, but all repositories called `this.pool.query()` directly. The repositories never saw the transactional client, so every query ran on a separate, auto-committed connection. Any use case wrapped with `TransactionDecorator` had no real atomicity — the `BEGIN`/`COMMIT` was a no-op.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested a fix for the UnitOfWork placebo bug, making the transactional client visible to all repositories that execute within a `runInTransaction` call, without changing repository constructor signatures or adding new ports.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Added test verifying transactionContext exposes the active client during runInTransaction and is cleared after | PgUnitOfWork.test.ts |
| Judge | Referenced | Evaluated AsyncLocalStorage as the non-invasive option over constructor injection or a context parameter | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- Added `src/infrastructure/database/transactionContext.ts` with:
  - `transactionContext`: `AsyncLocalStorage<PoolClient>` shared across all async descendants
  - `getQueryRunner(pool)`: returns the active transactional client if one exists, otherwise the pool (used in read methods)
  - `withTransactionalClient(pool, fn)`: joins the active transaction if one exists; otherwise acquires its own client and manages `BEGIN`/`COMMIT`/`ROLLBACK` (used in `save()` methods)
- `PgUnitOfWork.ts`: `runInTransaction` now calls `transactionContext.run(client, operation)` so the client is propagated to all async descendants
- `PgUserRepository.ts`: `save()` uses `getQueryRunner(this.pool).query()`
- `PgLevelRepository.ts`, `PgLeaderboardRepository.ts`, `PgProgressRepository.ts`: read methods use `getQueryRunner`; `save()` replaced manual `connect()` + `BEGIN`/`COMMIT` blocks with `withTransactionalClient`
- Added test `should_expose_transactional_client_via_context_during_operation` to `PgUnitOfWork.test.ts`
- Test count: 286 → 287

## Team modifications pending human review

- `withTransactionalClient` is designed for single-aggregate `save()` calls. If a future use case needs to save two aggregates in one transaction via the UoW, the outer `runInTransaction` already covers both — no changes needed. However, if a repository `save()` is ever called directly outside a UoW context, it will manage its own transaction.

## Lessons / limitations

- `AsyncLocalStorage` is the Node.js idiomatic approach for propagating context across an async call tree without touching function signatures. It is available from Node 16+ with no extra dependencies.
- The `withTransactionalClient` guard (`if (existing) return fn(existing)`) is what makes the UoW and standalone-save scenarios composable without duplicating `BEGIN`/`COMMIT` logic.
