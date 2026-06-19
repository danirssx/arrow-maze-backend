# AI Log — MAZ-141 — Backend setup and level contract integration

## Ticket

- Linear: `MAZ-141`
- Branch: `fix/backend-integration-setup-MAZ-141`
- Worktree: `worktrees/am-MAZ-141-backend`

## Agent Roles Used

| Role | Status | Notes |
| --- | --- | --- |
| Spec Partner | Referenced | Used backend-as-source-of-truth requirement to expose level metadata needed by mobile. |
| Planner/Slicer | Referenced | Grouped DB setup and level contract changes under the integration ticket. |
| TDD Implementer | Used | Added DB setup script and extended level DTO outputs with tests. |
| Judge | Referenced | Ran typecheck, lint, OpenAPI export, and focused backend tests. |
| Mutation | Not used | Mutation testing was out of scope for this integration pass. |

## Summary

- Added `scripts/run-sql-files.mjs`.
- Added `db:migrate`, `db:seed`, and `db:setup` npm scripts.
- Updated README and release docs so migration `005_refactor_levels_to_arrow_specs.sql` runs before seeds.
- Extended `/levels` summaries with `arrowCount`, `attempts`, and optional `timeLimitSeconds`.
- Extended `/levels/:id` detail with optional `timeLimitSeconds`.
- Hardened level migrations so old maze columns (`board_rows`, `board_cols`, `move_count`) are removed and ArrowSpec columns are enforced.
- Regenerated the level seed without `move_count`.
- Updated Swagger source and regenerated `docs/openapi.json`.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run export-openapi`
- `npm test -- --runInBand tests/api/level-catalog/getLevels.test.ts tests/api/level-catalog/getLevel.test.ts tests/application/level-catalog/GetLevelsUseCase.test.ts tests/application/level-catalog/GetLevelUseCase.test.ts`
- `npm run verify` - green, 58 suites / 310 tests
- Local DB validation - green: 15 published Arrow Untangle levels, ArrowSpec path invariants, head direction rule, and DAG solvability.
- Temporary backend on `localhost:3001` - `/health`, `/levels`, and `/levels/:id` returned 200 against local Postgres.
- Docker backend on `localhost:3000` rebuilt from this worktree - `/health`, `/levels`, and `/levels/:id` returned 200 against the migrated DB.

## Notes

- `npm run export-openapi` and backend API tests needed elevated execution because sandboxing blocked local IPC/listener creation.
- Local Postgres was initially blocked by another container on `5432`; after that container was stopped, the Arrow Maze DB service was recreated/reconnected and migrations/seeds applied.
- Validation used a temporary ignored `node_modules` symlink to the main backend worktree, then removed it.
