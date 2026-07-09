# AI Usage Log: MAZ-173 Leaderboard Submit/Read Contract Planning

## Task / Problem

Prepare MAZ-173 for implementation: harden the backend leaderboard submit/read
contract so the client no longer controls leaderboard ids, entry ids, or
username snapshots, and so known levels with no scores return an empty
leaderboard instead of 404. The ticket is still in Linear Backlog and no
approved executable contract existed in the repository, so production TDD work
is blocked until the human approval gate is satisfied.

## Tool and Model

Codex / GPT-5.

## Prompt Used

The user asked Codex to work MAZ-173, review backend/client AGENTS.md,
MEMORY.md, Linear guidance, AI usage logging, affected tickets, create a new
worktree, and follow commit/PR/Linear rules. Local Linear was queried through
the configured environment variable without printing secrets.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Read and applied the requirement for a source-touching spec with behavior, HTTP contract, Clean Architecture contract, decisions, edge cases, and affected tickets. | `specs/leaderboard-submit-read-contract.spec.md`, Linear MAZ-173 |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Read and applied the requirement for stable executable Gherkin scenarios before TDD. No new Linear tickets were created because MAZ-173 already exists. | `specs/leaderboard-submit-read-contract.feature` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Referenced | Read and applied the precondition that no production code may be written until the executable contract is approved and the ticket is approved for implementation. | Blocked before `src`/`tests` edits |
| Judge (`.agents/judge.md`) | Referenced | Read and applied the requirement that source-touching tickets include a Clean Architecture contract with per-layer impact before implementation. | `specs/leaderboard-submit-read-contract.spec.md` |
| Mutation Tester (`.agents/mutation.md`) | Not used | No production code was changed, so mutation testing is not applicable yet. | N/A |

## Scenario Coverage (@s -> test)

Pending implementation after human approval:

- @s1 -> pending
- @s2 -> pending
- @s3 -> pending
- @s4 -> pending
- @s5 -> pending
- @s6 -> pending
- @s7 -> pending

## Result Obtained

- Created a new backend worktree at `worktrees/am-MAZ-173` on branch
  `refactor/backend-leaderboard-contract-MAZ-173`.
- Queried Linear MAZ-173 and confirmed it is in Backlog with `repo:backend`,
  `type:contract`, and `layer:framework` labels.
- Reviewed current leaderboard code and found that `LeaderboardController` and
  `SubmitScoreInput` still accept client-owned `leaderboardId`, `entryId`, and
  `usernameSnapshot`.
- Reviewed current read behavior and found that `GetLeaderboardService` returns
  `NotFoundError` whenever no leaderboard row exists, without checking whether
  the level exists.
- Reviewed affected tickets MAZ-174, MAZ-183, and MAZ-184 in Linear.
- Added `specs/leaderboard-submit-read-contract.spec.md`.
- Added `specs/leaderboard-submit-read-contract.feature` with scenarios `@s1`
  through `@s7`.

## Verification

- `npm ci` (required because the new worktree did not have `node_modules`)
- `npm run verify` - passed: lint, typecheck, coverage, and build; 67 test
  suites / 436 tests passed.

## Team Modifications Pending Human Review

- Approve or change `specs/leaderboard-submit-read-contract.feature`.
- Move MAZ-173 from Backlog to Todo/In Progress according to the team Linear
  workflow before TDD implementation starts.
- Confirm stale-token user behavior: preserve MAZ-174's current user-not-found
  404, or remap missing authenticated user records to 401 for submit.
- Coordinate client MAZ-183 and MAZ-184 against the slim submit DTO and empty
  leaderboard response shape.

## Lessons / Limitations

The current backend already has the domain pieces needed for server-owned ids
(`LeaderboardId.generate()` and `EntryId.generate()`), and MAZ-174 provides a
precedent for resolving the authenticated user by token `userId`. The remaining
work is a contract/application refactor, but TDD implementation is intentionally
blocked until the executable contract is approved.
