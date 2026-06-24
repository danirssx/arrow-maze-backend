# AI Usage Log: MAZ-167 [CA-014] Enforce `reglas_clean_arch.md` strictly in the judge

## Task / Problem

Cross-repo docs/chore ticket (`MAZ-167`, temporary id `CA-014`,
milestone `M8 - Clean Architecture Remediation`). The judges already checked the
dependency rule but did not force reading/applying the **whole**
`reglas_clean_arch.md` checklist, nor force every `src`-touching ticket to
declare its per-layer impact through a `Clean Architecture contract`. There was
also no spec/ticket template carrying that contract, so future tickets had no
canonical shape for the judge to enforce.

## Tool and Model

Claude Code / claude-opus-4-8.

## Prompt Used

User asked to implement MAZ-167 following the repo agent rules: read both
`AGENTS.md`, the root `MEMORY.md`, `Linear_MCP_Guideline.md`, work in a fresh
worktree, log AI usage + run `compile-ai-usage.sh`, commit/push/PR and update
Linear. Read before implementing: `AGENTS.md`, root `MEMORY.md`,
`reglas_clean_arch.md`, the Linear ticket body, `.agents/*` and existing specs.
No secrets pasted.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | This ticket edits the prompt itself: added a mandatory `## Clean Architecture contract` step pointing at `specs/_TEMPLATE.spec.md`. No separate spec-partner session was run. | `.agents/spec-partner.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Referenced | Edited the prompt to require each `src`-touching slice/ticket carry the `Clean Architecture contract`. No separate planner session. | `.agents/planner.md` |
| TDD Implementer (`.agents/tdd-implementer.md`) | Not used | Docs-only ticket; no production code or tests. | N/A |
| Judge (`.agents/judge.md`) | Referenced | Main target of the change: tightened protocol step 1/3, verdict checklist and hard rules; followed its own dependency-rule constraints while editing. No separate judge session run against a PR. | `.agents/judge.md` |
| Mutation Tester (`.agents/mutation.md`) | Not used | No production code changed; nothing to mutate. | N/A |

## Scenario Coverage (@s ↔ test)

Not applicable — docs/chore ticket. Acceptance criteria are non-functional and
validated by manual dry-run of the judge protocol against this ticket's own
`Clean Architecture contract` (embedded in the Linear description).

## Result Obtained

- `specs/_TEMPLATE.spec.md` — new backend spec/ticket template with the
  mandatory `## Clean Architecture contract` section (applicable rules, per-layer
  impact, forbidden moves, required tests, architecture acceptance criteria).
- `.agents/judge.md` — protocol step 1 now reads `docs/reglas_clean_arch.md`
  (mirror of canonical `../reglas_clean_arch.md`) and requires applying the
  **whole** checklist; step 3 requires the contract follow the template and
  declare impact per layer; verdict checklist adds a per-layer-impact line and a
  note requiring one PASS/FAIL per applicable rule; two new hard rules.
- `.agents/spec-partner.md` / `.agents/planner.md` — require the contract in the
  generated spec and in every `src`-touching Linear ticket.

## Verification

- Docs-only change under `.agents/` and `specs/` (markdown); no `src`, `tests`
  or build config touched, so `npm run verify` is unaffected.
- Dry-run: MAZ-167's Linear description already carries a `## Clean Architecture
  contract` block (all layers `no previsto`, docs-only) — the judge protocol
  processes it and would not reject, satisfying the Definition of Done example.

## Team Modifications Pending Human Review

- The canonical `reglas_clean_arch.md` is mirrored into each repo's `docs/`.
  Path strategy kept as `docs/reglas_clean_arch.md` (self-contained per repo)
  with `../reglas_clean_arch.md` documented as the canonical fallback.
- Confirm `specs/_TEMPLATE.spec.md` (underscore prefix) is the desired template
  location and naming.

## Lessons / Limitations

- Much of CA-014's judge changes had already landed in prior commits; the real
  remaining gap was the missing spec/ticket template and wiring spec-partner +
  planner to it. Verified the existing state before adding, to avoid duplication.
