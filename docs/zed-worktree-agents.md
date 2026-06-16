# Zed Worktree Agent Flow

Use one Zed window per worktree and one ticket per worktree.

## Agent Setlist

1. A1 Spec Partner reads `AGENTS.md` and writes `specs/<feature>.spec.md`. No code.
2. A2 Planner reads the approved spec and creates small tickets. No production code.
3. A3 TDD Implementer works in one assigned worktree and one ticket only.
4. A4 Judge audits the PR. No code changes.
5. A5 Mutation Tester runs mutation testing on `domain` and `application` when configured.

## Worktree Commands

From this repository root:

```bash
./scripts/new-worktree.sh AM-42 feat auth-flow
```

Open the generated directory in a separate Zed window:

```bash
zed ../am-AM-42
```

Assign the matching `.agents/*.md` prompt to that Zed assistant session. Do not let an agent switch branches inside its worktree.

## Parallel Rule

Parallelize only independent tickets. If A2 marks a ticket as `blocked-by`, do not run it in parallel with its blocker.
