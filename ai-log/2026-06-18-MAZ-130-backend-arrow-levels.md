# 2026-06-18 - MAZ-130 Backend ArrowSpec Level Catalog

## Task / Problem

Refactor the backend Level Catalog from the old maze-navigation model (`BoardSize`, `CellSpec`, `CellType`, start/exit pathfinding) to the approved Arrow Untangle contract:

- `ArrowSpec[]` level definitions.
- Optional `attempts` with default 5.
- Solvability by detecting cycles in the arrow blocking graph (DAG), not by start-to-exit pathfinding.
- OpenAPI and persistence updated for the new contract.

## Tool and Model

- Tool: Codex CLI coding agent.
- Model: GPT-5 based Codex.

## Prompt Used

The user asked to implement MAZ-130 before MAZ-136 to avoid writing tests against backend functionality that did not exist yet. The implementation had to follow repo `AGENTS.md`, `MEMORY.md`, `Linear_MCP_Guideline.md`, and the refactor documents `Mecanica_Juego_Arrow_Untangle.md` and `Refactor_Arrow_Untangle_Tickets.md`.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Used the approved refactor mechanic/spec as the design source; no new design decision was invented. | `Mecanica_Juego_Arrow_Untangle.md`, `Refactor_Arrow_Untangle_Tickets.md`, Linear MAZ-130 |
| Planner/Slicer | Referenced | Followed the T1 slice boundaries: backend DTO/domain/persistence/API/Swagger only. | `Refactor_Arrow_Untangle_Tickets.md` T1 |
| TDD Implementer | Used | Added and rewrote tests for `ArrowSpec`, `LevelDefinition`, DAG solvability, use cases, mapper, repository, controller, and API behavior. | 310 backend tests passing in `npm run verify` |
| Judge | Referenced | Checked Clean Architecture boundaries and validated the full backend verify command before handoff. | `npm run verify` |
| Mutation Tester | Not used | Mutation testing was not part of MAZ-130 scope and no mutation tool was run. | N/A |

## Result Obtained

- Added backend `ArrowSpec` value object and updated `Position` to allow negative coordinates.
- Replaced `LevelDefinition` with `{ arrows, attempts }`.
- Replaced solvability logic with blocking-graph DAG detection.
- Removed domain source files for `BoardSize`, `CellSpec`, and `CellType`.
- Updated create/update/get level use cases and controller request handling.
- Updated `PgLevelRepository` and `LevelMapper` to persist `arrows` JSONB and `attempts`.
- Added migration `005_refactor_levels_to_arrow_specs.sql`.
- Rewrote seed levels as Arrow Untangle examples.
- Updated Swagger schemas and examples.
- Rewrote Level Catalog tests for the new model.

## Validation

```sh
npm run verify
```

Result: passed.

- Lint: passed.
- Typecheck: passed.
- Test coverage: passed, 58 suites / 310 tests.
- Build: passed.

## Team Modifications Pending Human Review

- Review whether backend should keep legacy `timeLimit` and `moveCount` as optional metadata. They are preserved for compatibility, but they are no longer part of the level-board definition.
- Review production DB migration order before applying to an existing database.
- Coordinate with mobile MAZ-136 after this branch is reviewed because backend DAG tests are now available.

## Lessons / Limitations

- This refactor should be merged before MAZ-136 backend test expansion, otherwise tests would target non-existent backend behavior.
- The migration keeps compatibility for old `board_rows`/`board_cols` columns if already present, while fresh installs use the new `arrows`/`attempts` schema.
