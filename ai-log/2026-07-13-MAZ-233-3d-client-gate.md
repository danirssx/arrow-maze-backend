# AI Usage Log: MAZ-233 — 3D Client Capability Gate (B8)

## Task / Problem

Resolve `MAZ-233` (B8) of the M13 "3D Volumetric Boards" milestone. Gate 3D levels behind a
client capability declaration so that existing clients (which don't know about the `z` coordinate)
never receive 3D levels and break silently. The gate uses the `X-Supports-3D: true` request header;
the check lives in the application layer (use cases), not in the framework layer.

## Tool and Model

Claude Code / Claude Sonnet 4.6.

## Prompt Used

User approved Gherkin scenarios @s1–@s5 after context review, then asked to proceed: "sí".

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Gherkin scenarios presented to user and approved before touching code. Design decision (header vs query param vs token claim; gate in application vs framework layer) documented in spec. | Conversation approval |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Scenarios @s1–@s5 defined before implementation. | Approved scenarios |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red (5 failing tests) → Green: tests added to GetLevelsUseCase.test.ts and GetLevelUseCase.test.ts first, then production changes. | `tests/application/level-catalog/GetLevelsUseCase.test.ts`, `tests/application/level-catalog/GetLevelUseCase.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | Blast-radius: `GetLevelUseCase.ts`, `GetLevelsUseCase.ts`, `LevelCatalogController.ts`, `openApiSpec.ts`, controller test mocks. No new entities or use cases introduced. | git diff |
| Mutation Tester (`.agents/mutation.md`) | Used | `stryker run --mutate "GetLevelUseCase.ts,GetLevelsUseCase.ts"` — see Verification section. | stryker clear-text report |

## @s → test map

| Scenario | Test |
| --- | --- |
| @s1 | `GetLevelsUseCase should_exclude_3d_levels_when_supports3d_is_false` |
| @s2 | `GetLevelsUseCase should_include_3d_levels_when_supports3d_is_true` |
| @s3 | `GetLevelUseCase should_throw_not_found_when_level_is_3d_and_supports3d_is_false` |
| @s4 | `GetLevelUseCase should_return_3d_level_when_supports3d_is_true` |
| @s5 | `GetLevelUseCase should_return_2d_level_when_supports3d_is_false` |

## Result Obtained

**`src/application/level-catalog/use-cases/GetLevelsUseCase.ts`**:
- `GetLevelsInput`: `Record<string, never>` → `{ supports3d?: boolean }`
- `execute()`: filters `levels.filter(l => l.dimensions === 2)` when `!input.supports3d`

**`src/application/level-catalog/use-cases/GetLevelUseCase.ts`**:
- `GetLevelInput`: adds `supports3d?: boolean`
- `execute()`: after finding the level, throws `NotFoundError` if `!input.supports3d && level.dimensions === 3`

**`src/framework/level-catalog/LevelCatalogController.ts`**:
- `listLevels()`: reads `req.headers['x-supports-3d'] === 'true'` → passes `supports3d` to use case
- `getLevel()`: reads same header → passes `supports3d` to use case

**`src/framework/swagger/openApiSpec.ts`**:
- `GET /levels` and `GET /levels/:levelId`: documented `X-Supports-3D` optional header parameter

**`tests/application/level-catalog/GetLevelsUseCase.test.ts`**: 2 new tests (@s1, @s2)

**`tests/application/level-catalog/GetLevelUseCase.test.ts`**: 3 new tests (@s3–@s5); also updated @s6–@s7 from B7 to pass `supports3d: true`

**`tests/framework/level-catalog/LevelCatalogController.test.ts`**: added `headers: {}` to all request mocks that call `listLevels` or `getLevel`

## Verification

- 22 tests in GetLevelUseCase + GetLevelsUseCase green (5 new + 17 existing).
- Full suite: 740 passing; 3 pre-existing failures on develop base.
- TypeScript: 5 pre-existing Prisma typecheck errors; zero new errors from B8.
- Mutation: `stryker --mutate "GetLevelUseCase.ts,GetLevelsUseCase.ts"` → **90.70%** overall (93.33% / 84.62%) >= break threshold 80. 3 survivors: NotFoundError string literal, `timeLimitSeconds` conditional, `level.dimensions` string literal — all pre-existing.

## Team Modifications Pending Human Review

- Application layer changes (GetLevelUseCase, GetLevelsUseCase) require human review (AGENTS.md section 5).
- The gate hides 3D levels from non-capable clients (returns 404 for individual 3D levels, silently omits 3D from list). This is intentional: clients that don't set the header should behave as if 3D levels don't exist.
- `supports3d` defaults to `false` (header absent = 2D only). No breaking change for existing clients.
- Existing tests that call `make3dPublishedLevel` in GetLevelUseCase tests were updated to pass `supports3d: true`.

## Lessons / Limitations

- Putting the gate in the application layer (not the framework layer) keeps the domain and application testable without HTTP. The controller is a thin translator from header → boolean.
- `GetLevelsInput` was previously typed `Record<string, never>` (empty object). Changing it to `{ supports3d?: boolean }` required updating the `execute({})` call in the controller and passing `{}` in existing tests, which was a zero-friction change.
- The `level.dimensions` getter (B6) is the single source of truth for the 2D/3D check — no scanning of arrow cells in the use case.
