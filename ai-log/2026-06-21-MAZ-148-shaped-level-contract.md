# AI Usage Log: MAZ-148 Support shaped Arrow Untangle level contract + persistence (backend)

## Task / Problem

Implement Phase-1 / MVP of the Abstract Shaped Boards plan in the backend under
**Option A** (the product owner's decision): `boardShape` is an optional `CELL_MASK`
that is a visual + authoring/placement mask, **not** a physical wall. Extraction
physics (`LevelSolvabilityPolicy` blocking-graph DAG) stay unchanged. Persist the
shape, expose it through the API, and reject invalid shapes with controlled errors.
Scope: domain `BoardShape` value object + `Level` arrow-containment invariant,
application create-input + read-DTO, Prisma `levels.board_shape` JSONB migration +
mapper + repository, and OpenAPI. Covers Gherkin `@s4`, `@s2b`, `@s3a–e`, `@s9`.
AI/Gemini and image upload are deferred to Phase 2 (MAZ-153).

## Tool and Model

Claude Code / Claude Opus 4.8.

## Prompt Used

The user asked to implement the whole `docs/abstract-shaped-boards-plan.md` following
both repos' `AGENTS.md`, root `MEMORY.md`, `Linear_MCP_Guideline.md`, a new worktree
per ticket, AI logging + `compile-ai-usage.sh`, MEMORY/AGENTS review, and
commit/push/PR/Linear — choosing **Option A** and deferring the Gemini/AI + image
upload work to a separate Phase-2 ticket. The Gherkin contract was approved at the
single human gate before any production code was written.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | The approved plan doc + Option A decision were distilled into a repo spec; no separate adversarial spec-partner session was run. | `specs/abstract-shaped-boards.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Used | Distilled the executable `.feature` (`@s1..@s10`, `@s8` deferred) and sliced the work into MAZ-148..153 in Linear Backlog with blocking relations + labels. | `specs/abstract-shaped-boards.feature`, MAZ-148..153 |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red→Green per unit: `BoardShape` VO, `Level` containment invariant, create-input mapping + read DTO, `LevelMapper` (de)serialize, repository persist, controller forward, OpenAPI. | tests below + `@s → test` map |
| Judge (`.agents/judge.md`) | Referenced | Pre-PR self-audit: confirmed scenario coverage and full `npm run verify` green; Clean Architecture boundaries respected (Prisma only in infrastructure). | `npm run verify` |
| Mutation Tester (`.agents/mutation.md`) | Used | Scoped StrykerJS on the new `BoardShape` VO: **91.18% ≥ 80** break threshold. Surviving mutants are error-message `StringLiteral`s only (tests assert error *type*, not text). | `npm run mutation -- --mutate src/domain/level-catalog/value-objects/BoardShape.ts` |

## Scenario Coverage (@s ↔ test)

- @s4 (persist + GET returns shape) →
  `GetLevelUseCase.test should_include_board_shape_in_definition_when_level_has_a_shape`,
  `PrismaLevelRepository.test should_upsert_board_shape_payload_when_level_has_a_shape`,
  `LevelMapper.test should_reconstitute_board_shape_when_record_has_one`.
- @s2b (backward compat, null shape) →
  `GetLevelUseCase.test should_omit_board_shape_when_level_has_none`,
  `LevelMapper.test should_reconstitute_without_board_shape_when_record_has_none`.
- @s3a (duplicate cells) → `BoardShape.test should_throw_when_cells_contain_duplicates`,
  `CreateLevelUseCase.test should_throw_when_board_shape_has_duplicate_cells`.
- @s3b (arrow outside mask) →
  `Level.test should_throw_when_an_arrow_cell_lies_outside_the_board_shape`,
  `CreateLevelUseCase.test should_throw_when_an_arrow_cell_lies_outside_the_board_shape`.
- @s3c (unsupported type) → `BoardShape.test should_throw_when_type_is_unsupported`,
  `CreateLevelUseCase.test should_throw_when_board_shape_type_is_unsupported`.
- @s3d (oversize >600) → `BoardShape.test should_throw_when_cells_exceed_the_maximum`
  (+ boundary `should_allow_exactly_the_maximum_number_of_cells`).
- @s3e (present-but-empty) → `BoardShape.test should_throw_when_cells_are_empty`.
- @s9 (OpenAPI documents shape) → `openApiSpec.test` (BoardShapeInput, CreateLevelRequest, LevelDefinitionDto).

(`@s7`, `@s7b`, `@s10` belong to MAZ-151/MAZ-152; `@s8` is the deferred MAZ-153.)

## Result Obtained

- **Domain**: `value-objects/BoardShape.ts` — immutable `CELL_MASK` value object
  (`create(type, cells)` validates type; `cellMask` enforces non-empty, no duplicates,
  `BOARD_SHAPE_MAX_CELLS = 600`; `contains` / `containsAll`; connectivity intentionally
  not enforced). `Level` aggregate gains an optional `boardShape` (trailing param on
  `draft`/`reconstitute`, single constructor invariant `assertArrowsWithinShape`: every
  arrow path cell must be inside the mask) + `boardShape` getter. `LevelSolvabilityPolicy`
  untouched.
- **Application**: `CreateLevelInput.boardShape?` + `mapBoardShapeInput`; `LevelDefinitionDto`
  gains optional `boardShape` (`BoardShapeDto`), populated by `GetLevelUseCase`.
- **Infrastructure**: Prisma schema `boardShape Json? @map("board_shape")`; hand-authored
  migration `20260621000000_add_level_board_shape` (nullable JSONB + CHECK
  `jsonb_typeof = 'object'`); `LevelMapper` `parseBoardShape` (defensive, throws
  `InfrastructureError` on corrupt JSONB) + `boardShapeToRecord`; `PrismaLevelRepository.save`
  persists the shape (or `Prisma.DbNull`). `prisma generate` run for the client types.
- **Framework**: controller forwards optional `boardShape`; OpenAPI adds `BoardShapeInput`
  and references it from `CreateLevelRequest` + `LevelDefinitionDto`.

## Verification

- `npm run verify` → **61 suites / 345 tests green**, lint + typecheck + build clean.
- `npm run mutation -- --mutate src/domain/.../BoardShape.ts` → **91.18%** (≥ 80 break).

## Team Modifications Pending Human Review

- **DB migration not applied to a live DB from this worktree** (hand-authored to avoid
  mutating the shared dev database). Run `npm run db:migrate` (`prisma migrate deploy`)
  before this lands in an environment; the existing `0_init` baseline orders before it.
- `prisma generate` updated the shared (symlinked) client to include `boardShape`.
- Connectivity of the mask is **not enforced** for MVP (islands allowed) and victory-time
  rendering is a client decision (MAZ-150) — both per the approved gate defaults.
- `AGENTS.md` needed no change: `BoardShape` is a value object (approved pattern
  category, gate-approved), Prisma stays in infrastructure, no new top-level folder.

## Lessons / Limitations

`exactOptionalPropertyTypes: true` rejects `x as CreateLevelInput['boardShape']` (which
includes `undefined`) inside a conditional spread; cast to `NonNullable<...>` instead.
For a nullable Prisma `Json?` column, write DB NULL with `Prisma.DbNull` (a runtime value,
so import `Prisma` as a value, not type-only). Scoping Stryker with `--mutate <file>` keeps
mutation fast and focused on the new logic instead of pre-existing untested branches.
