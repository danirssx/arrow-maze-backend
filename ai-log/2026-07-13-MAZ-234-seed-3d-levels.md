# AI Usage Log: MAZ-234 — Seed Hand-Made 3D Launch Levels (B9)

## Task / Problem

Resolve `MAZ-234` (B9) of the M13 "3D Volumetric Boards" milestone. Author and seed 3–5 hand-crafted 3D launch levels: update the authored level loader type to support `z` in path/boardShape cells, add fixture test cases for the 3D loader paths, and drop 3 validated 3D JSON levels into `prisma/seed-data/level-json/`.

## Tool and Model

Claude Code / Claude Sonnet 4.6.

## Prompt Used

User approved Gherkin scenarios @s1–@s4 after context review, then asked to proceed: "sí".

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Gherkin scenarios presented to user and approved before touching code. Design decision (type extension vs runtime-only; loader change vs domain change) documented in conversation. | Conversation approval |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Scenarios @s1–@s4 defined before implementation. | Approved scenarios |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red (@s4 failing — no 3D files in catalog) → Green: fixture dirs + JSON files + type update. | `tests/seed/authoredLevels.test.ts`, `prisma/seed-data/level-json/45-*.json` |
| Judge (`.agents/judge.md`) | Referenced | Blast-radius: `authoredLevels.ts` (type only), 3 new JSON files, 2 fixture dirs, test file. No use-case or domain changes. | git diff |
| Mutation Tester (`.agents/mutation.md`) | Not used | No new production logic introduced — only a type widening and JSON data files. Mutation on type-only changes produces no meaningful signal. | N/A |

## @s → test map

| Scenario | Test |
| --- | --- |
| @s1 | `loadAuthoredLevels should_load_3d_level_with_z_in_path_cells_without_throwing` |
| @s2 | `loadAuthoredLevels should_preserve_z_value_in_returned_path_cells` |
| @s3 | `loadAuthoredLevels should_throw_not_solvable_when_forward_back_arrows_form_a_cycle` |
| @s4 | `loadAuthoredLevels should_include_3d_launch_levels_in_main_catalog` |

## Result Obtained

**`prisma/seed-data/authoredLevels.ts`**:
- `AuthoredLevelJson.arrows[].path[]`: `{ row, col }` → `{ row, col, z?: number }`
- `AuthoredLevelJson.boardShape.cells[]`: same extension
- `AuthoredLevelRecord.arrows[].path[]` and `.boardShape.cells[]`: types updated to match

**`prisma/seed-data/level-json/45-layer-shift.json`** (EASY, order 45):
- 4 arrows, 2 layers (z=0 and z=1)
- Blocking chain: b (RIGHT, z=1) blocks a (FORWARD, z=0); d (UP, z=0) blocks via a's body
- Introduces FORWARD direction to players for the first time

**`prisma/seed-data/level-json/46-cross-layers.json`** (MEDIUM, order 46):
- 6 arrows, 2 layers
- Introduces BACK direction: arrow d travels from z=1 → z=0
- Chain: c blocks b, b blocks a; f blocks e; d is free

**`prisma/seed-data/level-json/47-staircase.json`** (HARD, order 47):
- 8 arrows, 3 layers (z=0, z=1, z=2)
- Staircase chain: c (z=2) blocks b (z=1) blocks a (z=0) via consecutive FORWARD hops
- d (BACK, 3-cell path crossing z=2→1→0) is free; h blocks g; f blocks e

**`tests/seed/fixtures/level-json-3d-valid/`**: fixture for @s1 and @s2
**`tests/seed/fixtures/level-json-3d-cycle/`**: fixture for @s3 (FORWARD/BACK mutual block)
**`tests/seed/authoredLevels.test.ts`**: 4 new tests (@s1–@s4)

## Verification

- 13 tests in authoredLevels.test.ts green (4 new + 9 existing).
- Full suite: 739 passing; 3 pre-existing failures on develop baseline.
- TypeScript: 5 pre-existing Prisma typecheck errors; zero new errors from B9.
- Mutation: not run — B9 introduced no new production logic (type widening only). JSON data files are validated at load time by the existing domain (ArrowSpec invariants + LevelSolvabilityPolicy).

## Team Modifications Pending Human Review

- `authoredLevels.ts` type change is safe (additive, `z` is optional) — existing 2D JSON files continue to load unchanged.
- The three hand-authored 3D levels (orders 45–47) were validated through the domain at test time: `recordToLevel` + `LevelSolvabilityPolicy.isSolvable()` ran on each file as part of `should_include_3d_launch_levels_in_main_catalog`.
- Human should visually verify the levels are fun and correctly designed for the game UI once the 3D client is available.

## Lessons / Limitations

- `AuthoredLevelJson` was typed with `{ row, col }` only, but `LevelMapper.recordToLevel` already accepted `z?: number` from B7. The loader passed JSON data through at runtime even without the type — the fix was purely additive TypeScript.
- For 3D FORWARD/BACK blocking, the key insight is: a FORWARD arrow (head at z=k) is blocked by any cell at (same row, same col, z > k). The arrow body does not need to travel in the z direction; the direction field alone determines the exit axis.
- Three independent solvability chains confirmed by manually tracing the blocking graph DAG before writing the JSON files.
