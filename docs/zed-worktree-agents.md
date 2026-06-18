# Zed Worktree Agent Flow

Use one Zed window per worktree and one ticket per worktree.

## Agent Setlist

1. A1 Spec Partner reads `AGENTS.md` and writes `specs/<feature>.spec.md`. No code.
2. A2 Planner reads the approved spec and creates small tickets. No production code.
3. A3 TDD Implementer works in one assigned worktree and one ticket only.
4. A4 Judge audits the PR. No code changes.
5. A5 Mutation Tester runs mutation testing on `domain` and `application` when configured.

## Required AI Log Traceability

Every significant ticket must record how the configured agents were used in `ai-log/<date>-<ticket>.md`.

Use `Used` only when the role prompt was applied directly for that step. Use `Referenced` when the active assistant read the role prompt and followed its constraints in the same session. Use `Not used` when the role did not apply.

Minimum expected trace for implementation tickets:

- Spec Partner: `Referenced` if the Linear ticket already contains the approved spec; `Used` only if a new spec was produced through alignment questions.
- Planner/Slicer: `Referenced` if the ticket already exists in Linear; `Used` only if new slices/tickets were generated.
- TDD Implementer: `Used` for code tickets that add tests first or iterate through test-driven checks.
- Judge: `Referenced` if the implementer self-audits before PR; `Used` only if a separate review pass/comment is produced.
- Mutation Tester: `Not used` until mutation tooling is configured; then `Used` only when mutation testing runs and logs survivors.

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

Parallelize only independent tickets. If A2 marks a ticket as `blocked-by`, do not run it in parallel with its blocker.
