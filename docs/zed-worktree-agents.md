# Zed Worktree Agent Flow

Use one Zed window per worktree and one ticket per worktree. This is the
Uncle Bob craftsmanship pipeline (full detail in [`workflow.md`](./workflow.md)).

## Agent Setlist

1. A1 `spec-partner` debates `AGENTS.md`-aligned decisions and writes `specs/<feature>.spec.md`. No code.
2. A2 `planner` (Gherkin Author) distills the spec into the `specs/<feature>.feature` executable contract and slices Linear tickets. No production code.
3. ⏸ **HUMAN approves the Gherkin contract** (`@s1..@sn`). This is the single human gate; nothing is implemented before it.
4. A3 `tdd-implementer` works in one assigned worktree and one ticket only, under the Three Laws of TDD (Red → Green → Refactor). Does not self-mark `done`.
5. A4 `judge` audits the PR against the `.feature`, scenario coverage, and the dependency rule. No code changes; APPROVED / CHANGES_REQUESTED.
6. A5 `mutation` runs mutation testing on `domain` and `application` once StrykerJS is configured. A feature reaches `done` only with Judge `APPROVED` **and** mutation above the threshold.

## Required AI Log Traceability

Every significant ticket must record how the configured agents were used in `ai-log/<date>-<ticket>.md`.

Use `Used` only when the role prompt was applied directly for that step. Use `Referenced` when the active assistant read the role prompt and followed its constraints in the same session. Use `Not used` when the role did not apply.

Minimum expected trace for implementation tickets:

- Spec Partner: `Referenced` if the Linear ticket already carries the approved spec; `Used` only if a new spec was produced through alignment debate.
- Planner / Gherkin Author: `Referenced` if the `.feature` contract and tickets already exist; `Used` only if a new contract was distilled or new slices were generated.
- TDD Implementer: `Used` for code tickets driven test-first; record the `@s → test` map and the Red-Green-Refactor cycles.
- Judge: `Referenced` if the implementer self-audits before PR against the checklist; `Used` only if a separate review pass/comment (`-judge.md`) is produced.
- Mutation Tester: `Used` when production code in `domain`/`application` changed and `npm run mutation` ran (log the score and survivors); `Not used` for docs-only or config-only tickets.

Copy `docs/ai-log-template.md` when creating new logs.

## Worktree Commands

From this repository root. Feature worktrees are created from `origin/develop`:

```bash
./scripts/new-worktree.sh AM-42 feat auth-flow
```

Open the generated directory in a separate Zed window:

```bash
zed ../am-AM-42
```

Assign the matching `.agents/*.md` prompt to that Zed assistant session. Do not let an agent switch branches inside its worktree.

Feature PRs target `develop`. Only human-approved release PRs target `main`.

## Parallel Rule

Parallelize only independent tickets. If A2 (`planner`) marks a ticket as `blocked-by`, do not run it in parallel with its blocker.
