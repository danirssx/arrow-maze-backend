# AI Usage Log: MAZ-216 flexible rectangular board definitions (backend planning)

## Task / Problem

Prepare the backend-side executable contract for `MAZ-216` / M12-04: make backend
admin create-level validation authoritative for explicit rectangular `boardSize`
definitions, enforce `12 x 12` and `60` arrow limits, and keep mobile compatibility
through the existing `definition.boardShape` read contract.

This is a planning/human-gate change only. No production code was written because no
approved MAZ-216 `.feature` contract existed before this session.

## Tool and Model

Codex CLI / GPT-5.

## Prompt Used

The user asked to start `MAZ-216`, following both repo `AGENTS.md` files, root
`MEMORY.md`, `Linear_MCP_Guideline.md`, new worktrees, AI usage logging,
`compile-ai-usage.sh`, checks, commit/push/PR/Linear, and to review affected tickets
because this is a refactor/factorization.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Distilled the Linear ticket and existing MAZ-148/207/OpenAPI contracts into a draft backend spec; no separate agent session was run. | `specs/flexible-rectangular-boards-MAZ-216.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Wrote the executable backend Gherkin scenarios `@s1..@s7` for the human gate. | `specs/flexible-rectangular-boards-MAZ-216.feature` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Not used | No TDD implementation was started because the MAZ-216 contract still needs human approval. | N/A |
| Judge (`.agents/judge.md`) | Referenced | Applied the Clean Architecture checklist to the proposed layer impact and forbidden moves. | this log + spec |
| Mutation Tester (`.agents/mutation.md`) | Not used | Mutation testing is not applicable to a contract-only planning change. | N/A |

## Scenario Coverage (@s -> evidence)

| Scenario | Evidence |
| --- | --- |
| `@s1` valid rectangle created and stored as full mask | `specs/flexible-rectangular-boards-MAZ-216.feature` |
| `@s2` existing requests without `boardSize` keep working | `specs/flexible-rectangular-boards-MAZ-216.feature` |
| `@s3` oversize dimensions rejected | `specs/flexible-rectangular-boards-MAZ-216.feature` |
| `@s4` more than 60 arrows rejected | `specs/flexible-rectangular-boards-MAZ-216.feature` |
| `@s5` arrow cells outside rectangle rejected | `specs/flexible-rectangular-boards-MAZ-216.feature` |
| `@s6` `boardSize` and `boardShape` are not mixed | `specs/flexible-rectangular-boards-MAZ-216.feature` |
| `@s7` OpenAPI documents rectangular input | `specs/flexible-rectangular-boards-MAZ-216.feature` |

## Result Obtained

- Added `specs/flexible-rectangular-boards-MAZ-216.spec.md` with backend behavior,
  HTTP contract, Clean Architecture placement, edge cases, and decisions.
- Added `specs/flexible-rectangular-boards-MAZ-216.feature` with `@s1..@s7`.
- Proposed accepting `boardSize` on admin create requests, validating M12 constraints,
  and normalizing valid rectangles to full `CELL_MASK` `boardShape` for persistence/read.
- `npm run verify` green on rerun: lint, typecheck, coverage (`94` suites / `595` tests),
  and build. The first run hit a timeout in `tests/seed/demoCredentials.test.ts`; rerun passed
  without code changes.

## Team Modifications Pending Human Review

- Human approval is required for the `@s1..@s7` contract before any TDD implementation.
- The team must confirm the `boardSize` request field name and the decision to reject
  `boardSize` + `boardShape` in one request.
- If draft board dimensions must be mutable after creation, the update-definition contract
  needs an additional approved scenario before implementation.

## Lessons / Limitations

- Existing backend `BoardShape` support stores arbitrary masks with a 600-cell cap; MAZ-216
  needs a narrower rectangular authoring contract without breaking existing shaped levels.
- OpenAPI already contains some stale `boardSize` examples/messages; implementation should
  update those alongside the new schema if this contract is approved.
