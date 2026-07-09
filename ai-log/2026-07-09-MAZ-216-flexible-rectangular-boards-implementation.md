# AI Usage Log: MAZ-216 flexible rectangular board definitions (backend implementation)

## Task / Problem

Implement the approved MAZ-216 backend contract after human approval of the planning PR:
admin create-level requests may include `boardSize`, the backend enforces M12 limits
(`12 x 12`, max `60` arrows), rejects mixed `boardSize` + `boardShape`, normalizes valid
rectangles to a full `CELL_MASK` `boardShape`, and keeps existing non-`boardSize` create
requests compatible.

## Tool and Model

Codex CLI / GPT-5.

## Prompt Used

The user confirmed the MAZ-216 planning PRs were approved and asked to continue with
the ticket implementation, still following `AGENTS.md`, the TDD gate, AI logging,
checks, commit/push/PR, Linear, and MEMORY updates.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Used the approved MAZ-216 spec decision (`boardSize` -> full `CELL_MASK`) as the implementation boundary. | `specs/flexible-rectangular-boards-MAZ-216.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Implemented against the approved `@s1..@s7` Gherkin scenarios. | `specs/flexible-rectangular-boards-MAZ-216.feature` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Referenced | Added failing tests first for `BoardSize`, `LevelDefinition`, create use case, controller forwarding, OpenAPI, and `Level.updateDefinition` shape containment; then implemented the minimum production changes. | tests listed below |
| Judge (`.agents/judge.md`) | Referenced | Checked layer placement: domain value objects/aggregate invariants, application DTO mapping, framework forwarding/OpenAPI; Prisma unchanged. | `npm run verify` |
| Mutation Tester (`.agents/mutation.md`) | Referenced | Ran focused Stryker mutation on touched domain/application files; no separate mutation-agent session was run. | mutation score below |

## Scenario Coverage (@s -> test/evidence)

| Scenario | Evidence |
| --- | --- |
| `@s1` valid rectangle created and stored as full mask | `BoardSize.test`, `CreateLevelUseCase.test should_persist_full_rectangle_board_shape_when_board_size_is_present`, `createLevel.test should_forward_board_size_to_the_use_case_when_present` |
| `@s2` existing requests without `boardSize` keep working | existing `CreateLevelUseCase` create-success tests and `createLevel.test should_return_201_with_levelId_when_admin_creates_a_valid_level` |
| `@s3` oversize dimensions rejected | `BoardSize.test should_throw_when_dimensions_exceed_m12_limits`, `CreateLevelUseCase.test should_throw_when_board_size_exceeds_m12_limits` |
| `@s4` more than 60 arrows rejected | `LevelDefinition.test should_throw_when_arrow_count_exceeds_m12_limit` |
| `@s5` arrow cells outside rectangle rejected | `CreateLevelUseCase.test should_throw_when_arrow_cell_lies_outside_board_size` |
| `@s6` `boardSize` and `boardShape` are not mixed | `CreateLevelUseCase.test should_throw_when_board_size_and_board_shape_are_combined` |
| `@s7` OpenAPI documents rectangular input | `openApiSpec.test should_document_flexible_rectangular_board_size_in_create_level_request` |

## Result Obtained

- Added `BoardSize` value object (`12 x 12` positive-integer limit + row-major rectangle cells).
- Added `LEVEL_DEFINITION_MAX_ARROWS = 60` to `LevelDefinition`.
- Extended `CreateLevelInput` with optional `boardSize` and mapped it to a full
  `BoardShape.cellMask`; mixed `boardSize` + `boardShape` throws `ValidationError`.
- Forwarded `boardSize` through `LevelCatalogController`.
- Updated OpenAPI with `BoardSizeInput`, `boardSize` on `CreateLevelRequest`, and `maxItems: 60`
  for arrows.
- Tightened `Level.updateDefinition` so existing shaped/framed draft levels cannot later be
  updated with arrows outside their stored shape.

## Verification

- Focused red/green tests: `npm test -- --runInBand tests/domain/level-catalog/Level.test.ts tests/domain/level-catalog/value-objects/BoardSize.test.ts tests/domain/level-catalog/value-objects/LevelDefinition.test.ts tests/application/level-catalog/CreateLevelUseCase.test.ts tests/api/level-catalog/createLevel.test.ts tests/framework/swagger/openApiSpec.test.ts` -> `6` suites / `66` tests green.
- Full gate: `npm run verify` -> GREEN (`95` suites / `607` tests, lint, typecheck, coverage, build).
- Mutation: `npm run mutation -- --mutate src/domain/level-catalog/value-objects/BoardSize.ts,src/domain/level-catalog/value-objects/LevelDefinition.ts,src/domain/level-catalog/Level.ts,src/application/level-catalog/use-cases/CreateLevelUseCase.ts` -> `90.00%` (break threshold `80%`).

## Team Modifications Pending Human Review

- Verify that representing rectangles as full `boardShape` masks is acceptable for production
  payload size. With the approved M12 limit, the largest normalized rectangle is `144` cells,
  well below the existing `BoardShape` cap of `600`.

## Lessons / Limitations

- Existing shaped-board persistence was enough; no Prisma schema migration was needed.
- The existing `Level.updateDefinition` path did not re-check shape containment. MAZ-216 made
  that hole visible because rectangular `boardSize` is persisted as shape framing.
