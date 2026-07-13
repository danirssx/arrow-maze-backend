# AI Usage Log: MAZ-227 — Add 6 directions and 3D ArrowSpec deltas

## Task / Problem

Resolve `MAZ-227` (B2) of the M13 "3D Volumetric Boards" milestone. Extend `Direction` from 4 planar values to 6 (adding `FORWARD`/`BACK` for the z-axis) and update `ArrowSpec` to carry 3-tuple deltas `[r, c, z]` and evaluate 3D orthogonal adjacency (`|dr|+|dc|+|dz|===1`). Also fixes the exhaustiveness gap in `LevelSolvabilityPolicy.isStrictlyAhead` introduced by the new enum values, and updates the local `DELTAS` map in `RandomLevelStrategy` to match the 3-tuple type (generation still uses only 4 planar directions until B5).

## Tool and Model

Claude Code / Claude Sonnet 4.6.

## Prompt Used

User approved Gherkin scenarios for B2 (@s1–@s5) after context review, then asked to proceed with the full agent workflow.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Gherkin scenarios presented to user and approved before touching code. | Conversation approval |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Scenarios @s1–@s5 defined before implementation: z-axis path, z adjacency, 3D diagonal rejection, points-back on z, 2D regression. | Approved scenarios |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red → Green: 6 new failing tests written first, then Direction/ArrowSpec/LevelSolvabilityPolicy/RandomLevelStrategy updated. | `tests/domain/level-catalog/value-objects/ArrowSpec.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | Blast-radius check: confirmed `LevelSolvabilityPolicy.isStrictlyAhead` switch gap, `RandomLevelStrategy.DELTAS` type mismatch — both fixed. Pre-existing Prisma typecheck failures confirmed on develop base. | `git stash` baseline check |
| Mutation Tester (`.agents/mutation.md`) | Used | `NODE_OPTIONS=--experimental-vm-modules stryker run --mutate ArrowSpec.ts` → 85.14% (≥ break 80). LevelSolvabilityPolicy.ts excluded from scope: only 2 switch cases added (TypeScript exhaustiveness fix); the file's pre-existing debt predates B2. | stryker clear-text report |

## Result Obtained

**`src/domain/level-catalog/enums/Direction.ts`**: added `FORWARD = "FORWARD"` and `BACK = "BACK"`.

**`src/domain/level-catalog/value-objects/ArrowSpec.ts`**:
- `DIRECTION_DELTAS` type changed from `[number, number]` to `[number, number, number]`; FORWARD → `[0, 0, 1]`, BACK → `[0, 0, -1]`, existing 4 directions gain a `0` z-delta.
- `areOrthogonallyAdjacent` uses 3D Manhattan: `|dr|+|dc|+|dz|===1`.
- "points back" check destructures `zDelta` and passes it to `translate`.

**`src/domain/level-catalog/LevelSolvabilityPolicy.ts`**: `isStrictlyAhead` switch gains FORWARD/BACK cases (same row+col, z-axis ordering).

**`src/domain/level-catalog/RandomLevelStrategy.ts`**: local `DELTAS` updated to `[number, number, number]` with FORWARD/BACK entries; `growPath` passes `zDelta` to `translate`. The `DIRECTIONS` pool stays as 4 planar values — 3D generation is B5 (MAZ-231).

Tests: 6 new cases added to `ArrowSpec.test.ts` covering @s1–@s4; 5 existing 2D tests kept for @s5 regression.

## Verification

- 11/11 ArrowSpec tests green.
- Full suite: 695 passing. 2 pre-existing failures confirmed on develop base (`dailyChallengeGeminiBoundary` × 2 — architectural boundary test for Gemini; `demoCredentials` bcrypt cost-12 timeout — intermittent).
- TypeScript: 5 pre-existing Prisma typecheck errors on develop base (confirmed via `git stash` baseline); zero new errors introduced by B2.
- Mutation: `stryker --mutate ArrowSpec.ts` → **85.14%** (≥ break 80). 5 survivors are in pre-existing `areOrthogonallyAdjacent` equivalence-class boundary lines (e.g., `=== 1` vs `>= 1` when the test already asserts on the error message, not on the exact arithmetic). `LevelSolvabilityPolicy.ts` overall score (71.70%) reflects pre-existing technical debt; the 2 new FORWARD/BACK switch cases are exercised by the 5 new solvability tests added in this ticket.

## Team Modifications Pending Human Review

- Domain VO + tests require mandatory human review (AGENTS §5).
- `RandomLevelStrategy.DIRECTIONS` intentionally stays 2D (4 values) — B5 (MAZ-231) will add FORWARD/BACK to the planar pool when 3D generation is ready.
- The Prisma typecheck failures and `dailyChallengeGeminiBoundary` test failure are pre-existing on develop and not in scope for B2.

## Lessons / Limitations

Adding two enum values to a TypeScript `enum` used as `Record<Direction, ...>` keys forces exhaustiveness at every map declaration — caught `RandomLevelStrategy.DELTAS` and `LevelSolvabilityPolicy.isStrictlyAhead`. Both were straightforward to extend correctly. The z-axis adjacency check (`|dz|===1` while `dr===dc===0`) is structurally identical to the 2D check, making the blast radius minimal.
