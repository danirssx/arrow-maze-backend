# AI Usage Log: MAZ-170 Author 10+ large dense shaped levels (multi-cell arrows)

## Task / Problem

The product owner asked for a pack of large, densely-populated levels with recognizable
shapes (heart, animal, etc.) — varied like the original 1–15 — and with **no single-cell
arrows** (every arrow ≥ 2 cells). Authored them as JSON in `prisma/seed-data/level-json/`
so `npm run db:seed` publishes them.

## Tool and Model

Claude Code / Claude Opus 4.8 (1M).

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Not used | Creative brief given directly. | N/A |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Authored ticket MAZ-170. | MAZ-170 |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Extended the authoring tool to fill ASCII-mask regions; added a catalog test that the generated shaped pack uses only multi-cell arrows + carries a board shape. | `tests/seed/authoredLevels.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | `npm run verify` green; rendered the masks to confirm shapes read clearly and are well-populated; confirmed the base 15 regenerate byte-for-byte. | `npm run verify` |
| Mutation Tester (`.agents/mutation.md`) | Not used | No `src/domain`/`src/application` production code changed (only `scripts/`, JSON data, and a test). | N/A |

## Result Obtained

- **`scripts/generate-level-seed.ts`** (the authoring tool, out of the seed) now supports
  shaped boards: a level can carry an ASCII `mask` ('#' = cell); generation is confined to
  the mask via a `Region` abstraction, the start cell is drawn from the mask, density is
  measured over mask cells, and the JSON output emits the `boardShape`. The rectangle path
  is unchanged (the base 15 regenerate **byte-for-byte** — verified by `git diff`). Added a
  guard that rejects any single-cell arrow and `id`/`order` overrides.
- **11 new shaped levels** (orders 17–27, ids `…440040`–`…440050`), all dense (62–82% of
  mask cells covered), multi-cell arrows only, solvable DAGs, arrows fully inside the mask:
  Heart, Diamond, Pyramid, Plus, Up-Arrow, Hexagon, Cat, Ghost, House, Full-Moon (disc),
  Octagon. Difficulty/family varied for variety.
- The full catalog is now **27 levels** (15 rectangular + Cross Beacon #16 + 11 shaped).

## Verification

- `npm run verify` → **63 suites / 362 tests** green (lint + typecheck + build).
- Loader validated all 27 levels (solvable, arrows ⊆ mask, unique id/order).
- ASCII renders confirmed each shape reads clearly and is well-populated.

## Team Modifications Pending Human Review

- Run `npm run db:seed` to publish the 11 new levels (they appear as #17–#27).
- **Cross Beacon (#16)** keeps its single-cell `center` arrow by design of its minimal
  9-cell plus — it is the only single-cell arrow in the catalog. Left as-is since it was
  already approved/working; can be regenerated as a dense plus on request.
- Density on the most concave shapes (Cat ~63%, House/Full-Moon ~62%) is lower than the
  rectangular levels (87–99%) because irregular masks pack less tightly with non-overlapping
  monotone arrows; the dotted mask still renders the full shape. Arrow counts can be pushed
  higher per shape on request (with some risk of generation retries).

## Lessons / Limitations

Confining the proven monotone-family generator to a cell mask (instead of a rectangle)
reuses its dense + acyclic-by-construction guarantees for arbitrary shapes; the only care
needed was preserving the exact RNG draw sequence for the base 15 (mask start = 1 draw,
rectangle start = 2 draws) so their content does not drift. The dotted board background
renders the whole mask, so a shape stays recognizable even where arrows don't reach.
