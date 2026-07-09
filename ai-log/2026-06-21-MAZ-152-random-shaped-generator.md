# AI Usage Log: MAZ-152 Deterministic RandomLevelStrategy for shaped boards (backend)

## Task / Problem

Add a deterministic generator that produces playable Arrow Untangle levels from
constraints, placing arrows inside a given `BoardShape` mask (Option A — the mask is a
placement mask, not a wall) and validating every candidate through the SAME rules as
authored levels (ArrowSpec invariants, board-shape containment, `LevelSolvabilityPolicy`
DAG). Same seed ⇒ same level; bounded retries ⇒ a controlled generation failure rather
than an invalid/unsolvable level or a hang. Covers Gherkin `@s7`, `@s7b`. **Stacked on
MAZ-148** (the `BoardShape` value object); backend-first because solvability + the
catalog live here.

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
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Implemented the generation slice of the approved `.feature` (`@s7`, `@s7b`). | `specs/abstract-shaped-boards.feature`, MAZ-152 |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red→Green: seeded generator producing in-mask straight arrows, solver-rejection retries, controlled failure; then strengthened tests (golden layout, palette cycle, exact reasons) to bite. | `tests/domain/level-catalog/RandomLevelStrategy.test.ts` |
| Judge (`.agents/judge.md`) | Referenced | Pre-PR self-audit: `npm run verify` green; pure domain service (no infra/framework deps); reuses `LevelSolvabilityPolicy` so generated == authored validation. | `npm run verify` |
| Mutation Tester (`.agents/mutation.md`) | Used | Scoped StrykerJS on `RandomLevelStrategy.ts`: **88.03% ≥ 80** break threshold. Survivors are equivalent/defensive mutants (the redundant post-`growPath` containment re-check; off-by-one retry bounds that still find a solution). | `npm run mutation -- --mutate src/domain/level-catalog/RandomLevelStrategy.ts` |

## Scenario Coverage (@s ↔ test)

- @s7 (generated level passes the same validation + determinism) →
  `RandomLevelStrategy.test should_generate_a_solvable_level_with_arrows_inside_the_mask`,
  `should_produce_a_known_layout_for_a_fixed_seed`,
  `should_be_deterministic_for_the_same_seed`,
  `should_cycle_arrow_colors_through_the_palette`.
- @s7b (bounded generation failure, never invalid) →
  `should_return_a_controlled_failure_when_it_cannot_satisfy_the_options`,
  `should_reject_a_non_positive_arrow_count`,
  `should_reject_a_non_positive_max_arrow_length`.

## Result Obtained

- `src/domain/level-catalog/RandomLevelStrategy.ts`: a pure domain service.
  `generate(options)` (seed, difficulty, `BoardShape`, arrowCount, maxArrowLength,
  attempts, optional maxGenerationAttempts) returns a discriminated
  `RandomLevelResult` (`{ ok: true, definition, boardShape, difficulty }` or
  `{ ok: false, reason }`). A seeded PRNG (FNV-1a hash + mulberry32) + fixed iteration
  order make it deterministic. Each attempt places `arrowCount` straight, in-mask,
  non-overlapping snakes (head points forward ⇒ always-valid `ArrowSpec`); the candidate
  is accepted only if `LevelSolvabilityPolicy.isSolvable` holds, else a new attempt runs.
  After `maxGenerationAttempts` (default 200) it returns a controlled failure.

## Verification

- `npm run verify` → **62 suites / 350 tests** green (lint + typecheck + build).
- `npm run mutation -- --mutate RandomLevelStrategy.ts` → **88.03%** (≥ 80 break).

## Team Modifications Pending Human Review

- I chose **solver-rejection** (generate → validate with the policy → retry) over the
  plan's "reverse-dependency construction" preferred algorithm: it is simpler,
  deterministic, and reuses the existing policy so a generated level can never pass a
  check an authored level would fail. The plan explicitly lists both options.
- Not yet wired into a use case / endpoint or daily-challenge persistence — that is a
  follow-up (intentionally out of this slice's scope).
- `AGENTS.md` unchanged: `RandomLevelStrategy` was approved at the gate (`@s7`), is a pure
  domain service (no new top-level folder, no infra/framework import).

## Lessons / Limitations

Generators are hard to mutation-test from behavioural assertions alone — "produces a
valid level" lets PRNG/placement mutants survive. Pinning the exact layout for a fixed
seed (a golden test) plus asserting the palette cycle and the exact failure reasons is
what makes the tests bite (67% → 88%). Straight, forward-pointing arrows are always valid
`ArrowSpec`s, so generation only has to worry about mask-fit, overlap, and solvability.
