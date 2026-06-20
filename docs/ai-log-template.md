# AI Usage Log: <AM-### Ticket Title>

## Task / Problem

Describe the Linear ticket, defect, feature, or documentation task.

## Tool and Model

Codex / GPT-5.

## Prompt Used

Summarize the user prompt and any local guidelines read before implementation. Do not paste secrets.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Used / Referenced / Not used | Did it produce/align `specs/<feature>.spec.md` through debate, or was it only referenced? | `specs/...`, Linear issue, or N/A |
| Planner / Gherkin Author (`.agents/planner.md`) | Used / Referenced / Not used | Did it distill the Gherkin `.feature` contract and slice tickets, or was it only referenced? | `specs/<feature>.feature`, `plan/...`, Linear issue, or N/A |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used / Referenced / Not used | Describe the Red-Green-Refactor cycles and the `@s → test` map. | Tests, commit, PR |
| Judge (`.agents/judge.md`) | Used / Referenced / Not used | Describe scenario-coverage + quality verdict (APPROVED / CHANGES_REQUESTED). | `ai-log/<...>-judge.md`, PR comment, or N/A |
| Mutation Tester (`.agents/mutation.md`) | Used / Referenced / Not used | Describe the mutation run, score, and survivors. | `ai-log/<...>-mutation.md` + score, or N/A |

Use `Used` only when the role prompt was applied directly. Use `Referenced` when the prompt was read and its constraints guided the work in the same session (state the exact rule applied). Use `Not used` when the role did not apply (e.g. Mutation Tester until StrykerJS is configured).

## Scenario Coverage (@s ↔ test)

Map every Gherkin scenario from the approved `.feature` to the test that verifies it. Required for implementation tickets.

- @s1 → `should_<expected>_when_<condition>`
- @s2 → ...

## Result Obtained

List concrete files, behavior, tests, docs, or configuration produced.

## Verification

- `<command>`
- `<command>`

## Team Modifications Pending Human Review

- List decisions, tradeoffs, or assumptions the team must review.

## Lessons / Limitations

State what worked, what was limited, and what should be improved next.
