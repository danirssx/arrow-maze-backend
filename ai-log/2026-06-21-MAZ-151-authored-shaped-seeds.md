# AI Usage Log: MAZ-151 Seed authored abstract shaped levels (backend)

## Task / Problem

Add canonical authored abstract shaped levels (Option A) to the catalog and seed them.
Authored level JSON lives under `prisma/seed-data/level-json/`; a loader validates every
file through the domain reconstitution path and the solvability policy before the seed
upserts it (including `boardShape`). Covers Gherkin `@s10`. **Stacked on MAZ-148** (the
`BoardShape` value object + mapper + `levels.board_shape` column).

## Tool and Model

Claude Code / Claude Opus 4.8.

## Prompt Used

Implement the whole `docs/abstract-shaped-boards-plan.md` under Option A (AI/image
deferred), following both repos' `AGENTS.md`, root `MEMORY.md`, `Linear_MCP_Guideline.md`,
a worktree per ticket, AI logging + `compile-ai-usage.sh`, and commit/push/PR/Linear.
Gherkin contract approved at the single human gate.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | Followed the approved spec; no separate session. | `specs/abstract-shaped-boards.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Implemented the seed slice of the approved `.feature` (`@s10`). | `specs/abstract-shaped-boards.feature`, MAZ-151 |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Authored the shaped level JSON + loader + tests; the loader's validation core (`recordToLevel`, `BoardShape`, solvability) was TDD'd in MAZ-148 and is exercised here against real authored data. | `tests/seed/authoredLevels.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | Pre-PR self-audit: `npm run verify` green; the seed upserts through the same Prisma mappings as the app. | `npm run verify` |
| Mutation Tester (`.agents/mutation.md`) | Not used | No `src/domain` or `src/application` production code changed (new code is authored data + a `prisma/seed-data` loader, outside Stryker's mutate globs); the reused validation logic was mutation-tested in MAZ-148. | N/A |

## Scenario Coverage (@s ↔ test)

- @s10 (authored abstract level validated + published) →
  `authoredLevels.test should_load_and_validate_the_authored_shaped_levels`,
  `should_publish_only_levels_whose_arrows_fit_the_mask`,
  `should_throw_when_an_authored_level_is_invalid`.

## Result Obtained

- `prisma/seed-data/level-json/cross-beacon.json`: an abstract plus/cross-shaped level
  (9-cell `CELL_MASK`) with 5 arrows that form an acyclic blocking DAG (provably solvable).
- `prisma/seed-data/authoredLevels.ts`: `loadAuthoredLevels(dir?)` reads each `*.json`,
  reconstitutes it through `recordToLevel` (validating ArrowSpec invariants, the mask, and
  arrow-containment) and rejects it unless `LevelSolvabilityPolicy.isSolvable` holds, then
  returns a seed-ready record (status `PUBLISHED`).
- `prisma/seed.ts`: upserts the authored levels (idempotent) including `boardShape`
  (`Prisma.DbNull` when absent), so `GET /levels` lists the shaped level.

## Verification

- `npm run verify` → **62 suites / 349 tests** green (lint + typecheck + build).
- The authored JSON passes the same domain validation as API-created levels.

## Team Modifications Pending Human Review

- Seed must run against a DB (`npm run db:setup` / `npm run db:seed`) to publish the level;
  not exercised against a live DB here (no DB mutated from the worktree).
- `prisma/**` is outside `tsconfig` `include` (`src/**` only), so `tsc` does not typecheck
  `seed.ts`; the loader is typechecked via its Jest test and `seed.ts` mirrors the
  MAZ-148-tested repository `Prisma.DbNull` pattern. (Pre-existing for `seed.ts`.)
- `AGENTS.md` unchanged (no new folder/pattern; authored JSON is data, the loader reuses
  domain + mapper).

## Lessons / Limitations

Reusing `recordToLevel` + `LevelSolvabilityPolicy` as the authored-JSON validation gate
means the seed cannot publish a level the API itself would reject — one validation path,
no drift. An "all UP/RIGHT arrows" layout keeps the blocking graph acyclic, which is the
simplest way to author a provably solvable shaped puzzle.
