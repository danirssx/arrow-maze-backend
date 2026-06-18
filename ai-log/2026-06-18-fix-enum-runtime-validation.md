# AI Log — fix: add runtime enum guards via parseEnumFromInput / parseEnumFromDb

**Date:** 2026-06-18
**Branch:** fix/enum-runtime-validation

## Task / problem

TypeScript `as EnumType` casts were used throughout the application and infrastructure layers without any runtime check. An invalid string arriving from the HTTP body (e.g. an unknown `difficulty` value) or from a corrupted DB row would be silently accepted at compile time and propagate through the system, causing obscure downstream failures instead of a clear error at the entry point.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested a fix for all unsafe enum casts in the codebase, distinguishing between input coming from the HTTP layer (should produce a 422 ValidationError) and values coming from the database (should produce a 500 InfrastructureError indicating data corruption).

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Tests written alongside each production change; new LevelMapper.test.ts file created | CreateLevelUseCase.test.ts, LevelMapper.test.ts |
| Judge | Referenced | Reviewed the two-helper design (parseEnumFromInput vs parseEnumFromDb) to ensure layer separation was correct | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- Added `src/shared/parseEnum.ts` with two helpers:
  - `parseEnumFromInput` — throws `ValidationError` (422) for invalid values from the application layer
  - `parseEnumFromDb` — throws `InfrastructureError` (500) for corrupted values from the DB
- `CreateLevelUseCase.ts`: replaced `as CellType`, `as Direction`, `as Difficulty` with `parseEnumFromInput`
- `UpdateLevelDefinitionUseCase.ts`: replaced `as CellType`, `as Direction` with `parseEnumFromInput`
- `LevelMapper.ts`: replaced all 4 enum casts with `parseEnumFromDb`
- `PgUserRepository.ts`: replaced `as UserRole`, `as UserStatus` with `parseEnumFromDb`
- Added 3 tests to `CreateLevelUseCase.test.ts` covering invalid difficulty, cell type, and direction
- Added new `tests/infrastructure/level-catalog/LevelMapper.test.ts` (5 tests: valid reconstitution + InfrastructureError on 4 corrupted DB values)
- Test count: 279 → 294

## Team modifications pending human review

- `parseEnumFromDb` throws `InfrastructureError` with the raw DB value in the message. If that message ever surfaces to the client, it could leak internal field names. Confirm the error middleware never forwards 500 message bodies to the frontend.

## Lessons / limitations

- Splitting into two helpers (one per layer) makes the error contract explicit: 422 for bad user input, 500 for bad DB state. A single helper with a flag would have obscured which case each call site handles.
