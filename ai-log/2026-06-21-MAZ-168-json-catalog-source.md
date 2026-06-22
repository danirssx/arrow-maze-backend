# AI Usage Log: MAZ-168 level-json as the single source of truth for the catalog

## Task / Problem

Post-merge deep review of the catalog flow surfaced a **two-source drift**: the backend
catalog came from the generated `prisma/seed-data/levels.ts` (UUID ids) while the client
kept a parallel hardcoded `manualLevels.ts` (`manual-*` ids) used as a silent offline
fallback. Per product-owner decision, make **`prisma/seed-data/level-json/` the single
source of truth**: author levels as JSON files that are processed straight into the DB;
add an `order` field; keep the procedural generator OUT of the seed path.

## Tool and Model

Claude Code / Claude Opus 4.8 (1M).

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Not used | Direction set directly by the product owner in chat. | N/A |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Authored ticket MAZ-168 with the confirmed decisions (order field, generator out of seed, unique guard). | MAZ-168 |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Migrated 15 levels → JSON, reworked the loader (order/sort/unique) + seed, repurposed the generator, and updated the loader tests + fixtures. | `tests/seed/authoredLevels.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | Pre-PR self-audit: `npm run verify` green; verified the generator reproduces the migrated JSON byte-for-byte (no DB content change). | `npm run verify`, `git diff` |
| Mutation Tester (`.agents/mutation.md`) | Not used | No `src/domain`/`src/application` production code changed (only `prisma/`, `scripts/`, tests — outside Stryker's mutate globs). | N/A |

## Result Obtained

- **Migrated** the 15 published levels from `levels.ts` to per-level JSON files in
  `prisma/seed-data/level-json/` (`01-packed-start.json` … `15-hard-finale.json`),
  preserving ids/names/arrows/timeLimit exactly, each with an `order` (1–15).
- **`authoredLevels.ts`** (the catalog loader): added `order`, returns levels **sorted by
  order**, and **rejects duplicate `id` and duplicate `order`** (fail-fast) — this is the
  guard that would have caught the earlier Cross-Beacon UUID collision. Still validates
  every file through `recordToLevel` + `LevelSolvabilityPolicy`.
- **`seed.ts`**: the catalog is now seeded ENTIRELY from `loadAuthoredLevels()`; dropped
  the `SEED_LEVELS`/`levels.ts` loop. `createdAt` is derived from `order`
  (`ORDER_EPOCH + order*1s`) so `GET /levels` (ordered by `createdAt asc`) lists the
  catalog in author order — no schema change. Idempotent upsert keeps `boardShape`.
- **Deleted** `prisma/seed-data/levels.ts`.
- **`generate-level-seed.ts`**: repurposed to emit JSON files into `level-json/` (out of
  the seed); re-running it reproduced the migrated files byte-for-byte (determinism
  verified), and it leaves hand-authored files (e.g. `cross-beacon.json`) untouched.
- **`cross-beacon.json`**: id `…440020` → `…440030` (+ `order: 16`), folding in the
  earlier standalone UUID hotfix (which MAZ-168 supersedes).
- **README**: documented the JSON → DB → game authoring workflow + the level JSON shape.

## Verification

- `npm run verify` → **63 suites / 361 tests** green (lint + typecheck + build).
- Loader tests cover: full catalog from JSON, order sorting + uniqueness, shaped vs
  non-shaped levels, arrow containment, and duplicate-id / duplicate-order rejection.
- `git diff` after re-running the generator: **no change** to the migrated JSON (the
  catalog content in the DB is preserved exactly).

## Team Modifications Pending Human Review

- Run `npm run db:migrate && npm run db:seed` in an environment to publish the catalog
  (16 levels incl. Cross Beacon as #16). Seeding sets order-derived `createdAt`.
- This branch **supersedes** `fix/seed-cross-beacon-uuid-MAZ-151` (the Cross-Beacon id
  fix is included here); that standalone branch can be closed.
- The **client still maps the catalog from the API but currently drops `boardShape`**
  (`LevelCatalogMapper`/`LevelDetailDto`) — fixed in the companion ticket **MAZ-169**, so
  shaped DB levels render correctly. The client offline fallback fixtures
  (`manualLevels.ts`) are left as-is for now (degraded offline mode).

## Lessons / Limitations

A single validated JSON folder as the catalog source removes the client↔backend drift
and makes authoring a one-file drop. Deriving list order from an authored `order` field
(via `createdAt`) avoids a schema migration while keeping the level numbering stable and
intentional. Verifying the repurposed generator reproduced the migration byte-for-byte
was the key safety check that the DB content did not silently change.
