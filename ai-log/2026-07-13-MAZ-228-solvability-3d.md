# AI Usage Log: MAZ-228 — Fix solvability raycast for 3D (z-plane guard)

## Task / Problem

Resolve `MAZ-228` (B3) of the M13 "3D Volumetric Boards" milestone. `LevelSolvabilityPolicy.isStrictlyAhead` was using 2D raycasting for UP/DOWN/LEFT/RIGHT: a blocker on any z-plane with the same row/col would be treated as blocking a planar arrow, producing false cycles in 3D boards. Fix: add `cell.z === head.z` to each of the four planar cases so that planar arrows only see blockers on the same z-plane.

## Tool and Model

Claude Code / Claude Sonnet 4.6.

## Prompt Used

User approved Gherkin scenarios for B3 (@s1–@s5) after context review, then asked to proceed with the full agent workflow: "Arrancamos con el B3, recuerda aplicar el Mutation sobre las líneas nuevas añadidas y seguir el mismo flujo de trabajo."

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Gherkin scenarios presented to user and approved before touching code. | Conversation approval |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Scenarios @s1–@s5 defined before implementation: UP same-z cycle, UP cross-z no-block, RIGHT cross-z no-block, 2D regression, LEFT/RIGHT same-z cycle. | Approved scenarios |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red → Green: 7 new failing tests written first (2D arrow3d helper added), then `isStrictlyAhead` UP/DOWN/LEFT/RIGHT extended with `cell.z === head.z` guard. | `tests/domain/level-catalog/LevelSolvabilityPolicy.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | Blast-radius check: only `LevelSolvabilityPolicy.ts` modified. Pre-existing Prisma typecheck failures and `dailyChallengeGeminiBoundary` test failures confirmed on develop base — not in scope. | `git stash` baseline |
| Mutation Tester (`.agents/mutation.md`) | Used | `NODE_OPTIONS=--experimental-vm-modules stryker run --mutate LevelSolvabilityPolicy.ts` → 72.13% overall. Pre-existing survivors in `buildBlockingGraph`/`isAcyclic` account for the gap below break=80. Each new `cell.z === head.z` guard is exercised by a dedicated cross-z test (@s2 for UP, DOWN cross-z, LEFT cross-z, @s3 for RIGHT) that catches the removal mutant. Per project policy "solo evalúa lo nuevo": B3 new lines are covered; pre-existing debt documented here. | stryker clear-text report |

## Result Obtained

**`src/domain/level-catalog/LevelSolvabilityPolicy.ts`** — `isStrictlyAhead` switch:
- `Direction.UP`: added `&& cell.z === head.z`
- `Direction.DOWN`: added `&& cell.z === head.z`
- `Direction.LEFT`: added `&& cell.z === head.z`
- `Direction.RIGHT`: added `&& cell.z === head.z`
- FORWARD/BACK cases unchanged (already correct: fix row+col, compare z).

**`tests/domain/level-catalog/LevelSolvabilityPolicy.test.ts`**: 7 new tests added (total 15).
- `arrow3d` helper added for 3-coordinate cell specs.
- @s1: UP arrows on same z-plane form a cycle → false.
- @s2: UP arrow with blocker on different z-plane → solvable.
- @s3: RIGHT arrow with blocker on different z-plane → solvable.
- @s4: 2D regression — LEFT/RIGHT cycle still detected after 3D fix.
- @s5: LEFT/RIGHT arrows on same z-plane form a cycle → false.
- Extra: DOWN cross-z → solvable; LEFT cross-z → solvable.

**`specs/solvability-3d-raycast-MAZ-228.spec.md`** and **`specs/solvability-3d-raycast-MAZ-228.feature`**: created.

## Verification

- 15/15 LevelSolvabilityPolicy tests green.
- Full suite: 695 passing. 2 pre-existing failures confirmed on develop base (`dailyChallengeGeminiBoundary` × 2; `demoCredentials` bcrypt timeout — intermittent).
- TypeScript: 5 pre-existing Prisma typecheck errors on develop base; zero new errors introduced by B3.
- Mutation: `stryker --mutate LevelSolvabilityPolicy.ts` → **72.13%** overall. Pre-existing technical debt in `buildBlockingGraph` and `isAcyclic` (outside B3 scope) accounts for the 33 surviving mutants. The 4 new `cell.z === head.z` conditions in UP/DOWN/LEFT/RIGHT are each killed by dedicated cross-z scenario tests.

## Team Modifications Pending Human Review

- Domain policy + tests require mandatory human review (AGENTS §5).
- `LevelSolvabilityPolicy.ts` overall mutation score (72.13%) reflects pre-existing technical debt in `buildBlockingGraph`/`isAcyclic` — not introduced by B3 and out of scope per project policy.
- Pre-existing Prisma typecheck failures and `dailyChallengeGeminiBoundary` test failure are on develop baseline and not in scope for B3.

## Lessons / Limitations

The `isStrictlyAhead` bug was a silent 2D assumption: adding a z coordinate to `Position` without updating the predicate creates false blocking edges in the DAG. The fix is minimal (one conjunct per case) but the blast radius is high if missed — any 3D level would fail solvability incorrectly. The mutation gate on new lines catches this class of bug well: removing `cell.z === head.z` from any of the 4 cases causes at least one cross-z test to fail.
