# AI Usage

This file compiles significant AI-assisted work for the Arrow Maze backend.

## Tools Used

| Tool | Model/Version | Role |
| --- | --- | --- |
| Codex | GPT-5 | Project setup, configuration, documentation scaffolding |

## Task Log

Raw entries live in `ai-log/` and are compiled into this section before delivery.

<!-- AI_LOG_ENTRIES_START -->


---

# AI Usage Log: AM-001 Backend Guardrails

## Task / Problem

Resolve AM-001 by hardening backend guardrails for scripts, CI, architecture-boundary checks, and contributor documentation. Also review whether Linear MCP is configured for project-wide use and document safe setup guidance.

## Tool and Model

Codex / GPT-5.

## Prompt Used

The user asked Codex to check whether MCP was configured so anyone in the project could use it, provide a guideline for installing/using it, and resolve AM-001.

## Result Obtained

- Confirmed no shared MCP config is versioned in the project.
- Added a root Linear MCP guideline that documents safe user-local setup and usage.
- Added root `.gitignore` and `.env.example` to prevent committing local secrets.
- Updated backend test scripts so tests no longer pass when no tests exist.
- Added `test:coverage` and `verify` scripts.
- Updated backend PR CI to run tests with coverage.
- Documented backend architecture guardrails in `README.md` and `CONTRIBUTING.md`.
- Updated the PR template to require `npm run verify`.

## Team Modifications Pending Human Review

- Confirm the team-approved Linear MCP server or connector choice for each developer environment.
- Rotate any Linear API key that was pasted into chat or visible context.
- Confirm whether `npm run verify` should become a required local command before every PR.

## Lessons / Limitations

MCP secrets should not be committed or pasted into prompts. The repository can safely document the environment contract, but actual MCP authentication must remain user-local or connector-managed.



---

# AI Usage Log: AM-002 Backend Errors and API Responses

## Task / Problem

Resolve AM-002 / MAZ-73: introduce a consistent error hierarchy and a single
HTTP response envelope for every backend controller, and stop the error
middleware from leaking internal messages, stack traces, or secrets.

## Tool and Model

Claude Code / Claude Opus 4.8.

## Prompt Used

The user asked the agent to implement Linear ticket MAZ-73 following the Linear
MCP guideline and the client/backend/root guidelines to the letter.

## Result Obtained

- Added a shared error kernel in `src/shared/errors`:
  - `AppError` abstract base carrying `code`, `httpStatus`, `message`, and
    optional `details` (HTTP status is a plain number, no Express coupling).
  - `ApplicationError` family: `BadRequestError` (400), `UnauthorizedError`
    (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409),
    `ValidationError` (422).
  - `InfrastructureError` (500).
- Added `src/domain/errors/DomainError` with `BusinessRuleViolationError` (422)
  and `InvalidArgumentError` (400); domain depends only on the shared kernel.
- Added `ApiResponsePresenter` in `src/framework/errors` producing
  `{ status: "success", data }` and `{ status: "error", error: { code, message, details? } }`.
- Rewrote the error middleware as `createErrorMiddleware(logger)`: known
  `AppError`s return their safe envelope; any other error returns a generic 500
  with no internal message, logging the real cause through `sanitizeLogContext`.
- Added `notFoundMiddleware` so unmatched routes return the standard 404 envelope
  instead of Express's default HTML stack-trace page.
- Wired both middlewares and a `ConsoleLogger` into `src/framework/app.ts`.
- Documented the error envelope in the Swagger spec (`ErrorResponse` schema plus
  404/500 examples on `/health`).
- Added Supertest API tests for error mapping and leak prevention, plus unit
  tests for the error classes and the presenter (27 tests passing).

## Team Modifications Pending Human Review

- Confirm placing the application-level HTTP errors in `src/shared/errors` (per
  the ticket touch paths) versus `src/application`, and whether domain errors
  should carry `httpStatus` directly or have it mapped from `code` at the
  framework boundary.
- Confirm whether success responses should also be normalized through
  `ApiResponsePresenter.success` once real controllers exist (the `/health`
  route was intentionally left untouched to avoid out-of-scope changes).

## Lessons / Limitations

Keeping `httpStatus` as a plain number on the shared base lets the framework map
errors without any layer importing Express, satisfying the architecture guard.
JWT auth and persistence remain out of scope, so `UnauthorizedError` /
`ForbiddenError` are available but not yet enforced by real auth.


---

# AI Usage Log: AM-003 Backend AOP

## Task / Problem

Resolve AM-003 / MAZ-74 by adding explicit backend AOP wrappers for application-service logging and transaction boundaries without contaminating domain or framework layers.

## Tool and Model

Codex / GPT-5.

## Prompt Used

The user asked Codex to implement Linear ticket MAZ-74 and follow the correct workflow, including pull request creation.

## Result Obtained

- Added a generic `UseCase` contract for application decorators.
- Added `UseCaseLoggingDecorator` to log use-case start, finish, duration, and sanitized errors.
- Added `TransactionDecorator` to wrap application use cases with a `UnitOfWork` transaction boundary.
- Added the `UnitOfWork` application port.
- Added `sanitizeLogContext` to redact sensitive log values such as passwords, tokens, secrets, credentials, and authorization data.
- Added application tests for successful logging, sanitized error logging, transaction execution, transaction error propagation, and context sanitization.

## Team Modifications Pending Human Review

- Confirm whether all future application services should implement the generic `UseCase<Input, Output>` contract.
- Confirm the concrete `UnitOfWork` implementation once persistence is approved.
- Confirm whether stronger structured logging requirements are needed after AM-002 standardizes error classes.

## Lessons / Limitations

AM-003 can be implemented independently from HTTP error handling by keeping the AOP wrappers entirely in the application layer. The concrete transaction implementation remains intentionally deferred until persistence infrastructure is approved.



---

# AI Usage Log: AM-004 - Model Identity & Access domain

## Task / Problem

Model the Identity & Access bounded context as pure domain following Clean Architecture.
Implement Aggregate Root (`User`), Factory (`UserFactory`), Value Objects (`UserId`, `Email`, `Username`, `RawPassword`, `PasswordHash`), enums (`UserRole`, `UserStatus`), and Domain Events (`UserRegistered`, `UserPasswordChanged`, `UserSuspended`).

## Tool and Model

Claude Code / claude-sonnet-4-6.

## Prompt Used

User instructed to implement ticket AM-004 in full, including branch creation, TDD test suite, production code, and commit.

## Result Obtained

- `src/domain/errors/DomainError.ts` — base domain error with code and prototype fix.
- `src/domain/events/DomainEvent.ts` — shared base interface for domain events.
- `src/domain/identity/value-objects/` — five value objects with validation and `equals`.
- `src/domain/identity/enums/` — `UserRole` and `UserStatus` enums.
- `src/domain/identity/events/` — three domain events implementing `DomainEvent`.
- `src/domain/identity/User.ts` — Aggregate Root with `register`, `reconstitute`, `changePassword`, `suspend`, `pullDomainEvents`.
- `src/domain/identity/UserFactory.ts` — Factory that generates a `UserId` and delegates to `User.register`.
- `tests/domain/identity/` — 50 tests covering invariants, value object equality, event emission, and edge cases.
- typecheck, lint, and test suite pass with zero errors.

## Team Modifications Pending Human Review

- Domain test suite is subject to mandatory human review per AGENTS.md §5.
- `DomainError` in `src/domain/errors/` may need alignment with AM-002 error hierarchy once that branch is merged.
- `src/domain/events/DomainEvent.ts` is a shared interface; placement should be confirmed by team if other aggregates reuse it.

## Lessons / Limitations

- `NodeNext` module resolution requires `.js` extensions in all imports even for TypeScript source files.
- The ESLint rule `@typescript-eslint/consistent-type-imports` requires `import type` for classes used only as type annotations (not instantiated), even when they are classes and not interfaces.
- `PasswordHash` intentionally has no validation — the hashing contract belongs to infrastructure, not domain.


---

# AI Usage Log: Branch Workflow Setup

## Task / Problem

Configure the repository branch workflow after `main` and `develop` were created.

## Tool and Model

Codex / GPT-5.

## Prompt Used

The user asked Codex to configure branches for the client and backend repositories and clarify what must be set in GitHub before starting the workflow.

## Result Obtained

Updated worktree scripts and agent/contribution documentation so feature work starts from `origin/develop`, feature PRs target `develop`, and only human-approved release PRs target `main`.

## Team Modifications Pending Human Review

- Confirm whether the team wants `develop` or `main` as the GitHub default branch.
- Configure branch protection rules in GitHub for `main` and `develop`.

## Lessons / Limitations

When a project uses both `main` and `develop`, agent instructions must be explicit about PR targets to avoid accidental release-branch work.


---

# AI Usage Log: Project Setup

## Task / Problem

Create the initial backend repository configuration and governance scaffolding based on the project build guideline.

## Tool and Model

Codex / GPT-5.

## Prompt Used

The user asked Codex to build the project setup following `Build Completo del proyecto.md`, `Config de Agentes completa.md`, and the documentation guidance, with emphasis on configuration, build, agents, Zed, and Git worktrees.

## Result Obtained

Generated initial Node/Express/TypeScript configuration, Clean Architecture folders, lint/typecheck/test/build scripts, GitHub Actions, Docker support, Swagger base, Husky/Commitlint, AI usage templates, PR template, agent prompts, and worktree scripts.

## Team Modifications Pending Human Review

- Review dependency versions before freezing the baseline branch.
- Confirm the backend persistence decision before adding database adapters or auth use cases.
- Complete human modifications after reviewing this setup.

## Lessons / Limitations

The setup intentionally avoids auth, progress, leaderboard, level definitions, and persistence adapters because those require team approval under `AGENTS.md`.


---

# AI Usage Log: Section 6 and Section 7 Compliance

## Task / Problem

Add explicit project rules requiring README completeness and AI usage traceability according to Section 6 and Section 7 of the project statement.

## Tool and Model

Codex / GPT-5.

## Prompt Used

The user provided compliance text in Spanish and asked to add it to the guideline or `AGENTS.md`, emphasizing README completeness, AI documentation, critical review, tests, and team responsibility.

## Result Obtained

Updated `AGENTS.md` with a mandatory Section 6 and Section 7 compliance section, and added an Academic Compliance section to `README.md`.

## Team Modifications Pending Human Review

- Confirm the final wording matches the professor's statement.
- Expand README sections for SOLID, AOP strategy, and diagrams as the implementation decisions are approved.

## Lessons / Limitations

Compliance rules should live where agents cannot miss them: `AGENTS.md`, with a README summary for human contributors and evaluators.


---

# AI Log — AM-005 — Implement Identity application services

**Date:** 2026-06-17
**Ticket:** MAZ-76 (AM-005)
**Branch:** feat/identity-application-AM-005

## Task / problem

Implement the application layer for the Identity bounded context: ports (interfaces) and use cases for user registration and login, following Clean Architecture boundaries established in AM-001 through AM-004.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

> Arrancamos con MAZ-76 o AM-005 — implement Identity application services. The domain is complete (AM-004 Done). Create the ports and use cases needed for register and login.

## Result obtained

Generated 5 files:

- `src/application/identity/ports/UserRepository.ts` — interface: save, findById, findByEmail, existsByEmail, existsByUsername
- `src/application/identity/ports/PasswordHasher.ts` — interface: hash(RawPassword), verify(RawPassword, PasswordHash)
- `src/application/identity/ports/TokenService.ts` — interface: generate(TokenPayload), verify(token)
- `src/application/identity/use-cases/RegisterUserUseCase.ts` — validates uniqueness, hashes password, persists user
- `src/application/identity/use-cases/LoginUseCase.ts` — authenticates credentials, checks account status, returns access token

`npm run typecheck` and `npm run lint` pass with no errors.

## Team modifications pending human review

- Verify that the order of checks in `LoginUseCase` (email format → user lookup → password verify → status check) matches the team's security expectations.
- Confirm whether `existsByEmail` and `existsByUsername` as separate queries is preferred over a single `findByEmail` + manual check in `RegisterUserUseCase`.
- Review the decision to catch `InvalidArgumentError` from value objects in `LoginUseCase` and rethrow as `UnauthorizedError("Invalid credentials")` — this prevents leaking account existence but may hide misconfigured clients.

## Lessons / limitations

- `HUSKY=0` alone is not enough in Docker production builds when the binary doesn't exist — `--ignore-scripts` is required (fixed in PR #8).
- `PasswordHasher` and `TokenService` must be ports, not concrete implementations — bcrypt and JWT belong exclusively in `src/infrastructure`.
- Tests for these use cases will be added in AM-008; `npm run verify` cannot pass fully until then.


---

# AI Usage Log: Agent Role Traceability Documentation

## Task / Problem

Clarify whether ticket work has been following the configured `.agents/` workflow and update documentation so future `ai-log/` entries explicitly record which agent roles were used and how.

## Tool and Model

Codex / GPT-5.

## Prompt Used

The user asked whether each ticket has used the configured agents from each repo and requested documentation changes so every `ai-log/` records why and how each agent was used.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Reviewed the role boundary to distinguish actual spec alignment from referencing an approved Linear spec. | `.agents/spec-partner.md`, `AGENTS.md` |
| Planner/Slicer | Referenced | Reviewed planner responsibilities and documented when existing Linear tickets count as referenced planning rather than a new planner run. | `.agents/planner.md`, `docs/zed-worktree-agents.md` |
| TDD Implementer | Referenced | Updated logging requirements for implementation tickets that use test-guided or TDD-style work. | `.agents/tdd-implementer.md`, `docs/ai-log-template.md` |
| Judge | Referenced | Added guidance for recording self-audit versus a separate judge review. | `.agents/judge.md`, `docs/zed-worktree-agents.md` |
| Mutation Tester | Referenced | Added explicit `Not used` / future `Used` guidance until mutation tooling is configured. | `.agents/mutation.md`, `docs/ai-log-template.md` |

## Result Obtained

Updated backend documentation so future logs must include an `Agent Roles Used` table with `Used`, `Referenced`, or `Not used` status for every configured role. Added `docs/ai-log-template.md` as the source template for future logs.

## Verification

- Documentation-only change; reviewed modified Markdown files.

## Team Modifications Pending Human Review

- Decide whether prior historical `ai-log/` entries should be retroactively annotated or left as-is to avoid overstating past agent usage.
- Decide whether future PR templates should also require checking the `Agent Roles Used` section.

## Lessons / Limitations

Past work followed `AGENTS.md` constraints and role intent, but logs did not make the distinction between literal agent execution and same-session referenced roles. Future logs must be explicit and auditable.


<!-- AI_LOG_ENTRIES_END -->

## Critical Evaluation

### Approximate AI-Assisted Work

| Area | Estimate |
| --- | --- |
| Boilerplate and configuration | Pending |
| Pattern implementation | Pending |
| Backend business logic | Pending |
| Tests | Pending |
| Documentation | Pending |
| Architectural decisions | 0% unless explicitly approved by the team |

### AI Failure Cases

Pending. Add concrete cases discovered during reviews.

### Reflection

Pending. Complete before final delivery with what accelerated delivery, what required review, and what the team would do differently.
