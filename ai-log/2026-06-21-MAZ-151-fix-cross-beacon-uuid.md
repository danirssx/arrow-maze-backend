# AI Usage Log: MAZ-151 hotfix — Cross Beacon UUID collision

## Task / Problem

The authored shaped level `cross-beacon.json` (MAZ-151) used id
`550e8400-e29b-41d4-a716-446655440020`, which is already owned by a `SEED_LEVELS`
entry ("Hard Stack", levels use `...440010`..`...440024`). Because `prisma/seed.ts`
upserts authored levels *after* `SEED_LEVELS`, seeding would have **overwritten**
"Hard Stack" instead of adding Cross Beacon as a new level. Caught during a post-merge
review of `develop`.

## Tool and Model

Claude Code / Claude Opus 4.8.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Not used | Trivial data fix, no spec change. | N/A |
| Planner / Gherkin Author (`.agents/planner.md`) | Not used | No new scenario. | N/A |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Changed the colliding id to a free one and updated the loader test's expected id. | `prisma/seed-data/level-json/cross-beacon.json`, `tests/seed/authoredLevels.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | `npm run verify` green; confirmed `...440030` is unused across `prisma/`. | `npm run verify` |
| Mutation Tester (`.agents/mutation.md`) | Not used | No `src/domain`/`src/application` production code changed (data + test only). | N/A |

## Result Obtained

- `cross-beacon.json` id `...440020` → `...440030` (free; seed UUIDs end at `...440024`).
- Updated `authoredLevels.test.ts` expected id accordingly.
- Cross Beacon now seeds as an additional published level (no longer overwrites "Hard Stack").

## Verification

- `npm run verify` → **63 suites / 356 tests** green (lint + typecheck + build).
- `tests/seed/authoredLevels.test.ts` green; no remaining `...440020` reference for the authored level.

## Lessons / Limitations

Authored-level ids must be allocated outside the existing `SEED_LEVELS` UUID range; a
follow-up could add a seed-time uniqueness assertion across `SEED_LEVELS` + authored
levels to fail fast on future collisions.
