# AI Usage Log: MAZ-229 — Add depth to BoardSize and 3D support to BoardShape

## Task / Problem

Resolve `MAZ-229` (B4) of the M13 "3D Volumetric Boards" milestone. `BoardSize` gains a `depth` dimension: new constant `BOARD_SIZE_MAX_DEPTH = 6`, optional `depth` parameter (default 1 for 2D backward compat), `depth` accessor, and a triple-loop `toCells()` (z-outer, row-middle, col-inner). `BoardShape` required no production code changes — `Position.toKey()` already emits `r,c,z` since B1, so `contains()` differentiates by z automatically. B4 adds tests to document and protect that behavior.

## Tool and Model

Claude Code / Claude Sonnet 4.6.

## Prompt Used

User approved Gherkin scenarios @s1–@s9 (5 for BoardSize, 4 for BoardShape) after context review, then asked to proceed with the full agent workflow.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Gherkin scenarios presented to user and approved before touching code. | Conversation approval |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Scenarios @s1–@s9 defined before implementation. | Approved scenarios |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red → Green: 9 new failing tests written first, then BoardSize.ts updated. BoardShape required no production changes. | `tests/domain/level-catalog/value-objects/BoardSize.test.ts`, `BoardShape.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | Blast-radius check: only BoardSize.ts modified in production. Pre-existing Prisma typecheck failures and `dailyChallengeGeminiBoundary` test failures confirmed on develop base. | `git stash` baseline |
| Mutation Tester (`.agents/mutation.md`) | Used | `NODE_OPTIONS=--experimental-vm-modules stryker run --mutate BoardSize.ts` — see Verification section for score. | stryker clear-text report |

## Result Obtained

**`src/domain/level-catalog/value-objects/BoardSize.ts`**:
- Added `BOARD_SIZE_MAX_DEPTH = 6`
- Added `_depth` field to constructor
- `create(rows, cols, depth = 1)` — depth defaults to 1 for 2D backward compat; validates positive integer and ≤ BOARD_SIZE_MAX_DEPTH
- Added `depth` getter
- `toCells()` now triple-loops: z-outer → row-middle → col-inner; positions carry z coordinate

**`tests/domain/level-catalog/value-objects/BoardSize.test.ts`**: 5 new tests:
- @s1: create 3D and read all accessors
- @s2: toCells enumerates all z-planes in correct order
- @s3: reject invalid depth (0, -1, 1.5)
- @s4: reject depth > BOARD_SIZE_MAX_DEPTH
- @s5: backward compat — depth omitted → depth=1, all cells at z=0

**`tests/domain/level-catalog/value-objects/BoardShape.test.ts`**: 4 new tests (no production code change):
- @s6: contains returns false for same row/col but different z
- @s7: contains returns true for matching 3D position
- @s8: Position(0,0,0) and Position(0,0,1) are distinct cells (size=2, no error)
- @s9: exact 3D duplicate throws Duplicate error

**`specs/boardsize-boardshape-3d-MAZ-229.spec.md`** and **`.feature`**: created.

## Verification

- 23/23 BoardSize + BoardShape tests green (9 new + 14 existing).
- Full suite: 717 passing; 2 pre-existing failures (`dailyChallengeGeminiBoundary` × 2) on develop base.
- TypeScript: 5 pre-existing Prisma typecheck errors on develop baseline; zero new errors from B4.
- Mutation: `stryker --mutate BoardSize.ts` → **95.16%** (≥ break threshold 80). 3 survivors are boundary `>=` vs `>` equivalence mutants on the three `MAX_*` comparisons — same pre-existing pattern seen in other VOs.

## Team Modifications Pending Human Review

- Domain VO changes and tests require mandatory human review (AGENTS §5).
- `toCells()` loop order (z-outer, row-middle, col-inner) is a convention decision — team should validate it matches client rendering expectations.
- Pre-existing Prisma typecheck failures and `dailyChallengeGeminiBoundary` test failure are on develop baseline and not in scope for B4.

## Lessons / Limitations

`Position.toKey()` being extended to `r,c,z` in B1 made `BoardShape` effectively 3D for free — a good example of the VO chain propagating 3D semantics upward without changes at higher layers. The key insight is that key-based membership sets always inherit the semantics of the key function, so extending `toKey` once is sufficient for all consumers. `BoardSize.toCells()` needed explicit depth propagation because it constructs positions (it's a generator, not a consumer).
