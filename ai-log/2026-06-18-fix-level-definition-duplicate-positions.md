# AI Log — fix: validate duplicate positions in LevelDefinition

**Date:** 2026-06-18
**Branch:** fix/level-definition-duplicate-positions

## Task / problem

`LevelDefinition.create()` validated bounds and START/EXIT counts but did not check for duplicate positions. Two cells could occupy the same `(row, col)` and the domain would accept them, deferring the constraint to the SQL `UNIQUE(level_id, row, col)` index. Domain invariants must be enforced at the VO level.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

Continuation of critical bug fix session.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Added test alongside production change | LevelDefinition.test.ts |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `LevelDefinition.create()`: added `Set<string>` keyed by `${row},${col}` to detect duplicates during the existing bounds check loop; throws `InvalidArgumentError` on duplicate
- Added test `should_throw_when_two_cells_share_the_same_position`
- 279 tests pass, `tsc --noEmit` clean

## Lessons / limitations

- Duplicate detection is O(n) with the Set, same pass as bounds checking — no extra loop needed.
