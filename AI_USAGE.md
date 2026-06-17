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

User instructed to implement ticket AM-005 (Identity application services), creating the application ports and use cases for user registration and login on top of the completed AM-004 domain layer.

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

# AI Log — AM-006 — Implement Identity infrastructure and persistence

**Date:** 2026-06-17
**Ticket:** MAZ-77 (AM-006)
**Branch:** feat/identity-infrastructure-AM-006

## Task / problem

Implement the concrete adapters in the infrastructure layer for the Identity bounded context: persist users to PostgreSQL, hash passwords with bcrypt, generate and verify JWT access tokens, and wrap operations in DB transactions. This closes the ports defined in AM-005.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User instructed to implement ticket AM-006 (Identity infrastructure and persistence), following all project conventions from claude-memory.md and AGENTS.md.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Port contracts (UserRepository, PasswordHasher, TokenService) from AM-005 used as spec | src/application/identity/ports/ |
| Planner/Slicer | Referenced | Dependency direction (infrastructure → application → domain) enforced throughout | AGENTS.md §1, §8 |
| TDD Implementer | Used | Tests written for all four adapters; run before implementation was verified green | tests/infrastructure/ |
| Judge | Not used | N/A |
| Mutation Tester | Not used | N/A |

## Result obtained

Generated 10 files:

- `src/infrastructure/identity/BcryptPasswordHasher.ts` — Adapter implementing PasswordHasher with bcryptjs (saltRounds=12 production, configurable)
- `src/infrastructure/identity/JwtTokenService.ts` — Adapter implementing TokenService with jsonwebtoken (7d expiry, throws UnauthorizedError on invalid)
- `src/infrastructure/identity/PgUserRepository.ts` — Repository+Adapter implementing UserRepository with pg Pool; uses UPSERT on save, reconstitutes User aggregate from rows
- `src/infrastructure/database/PgUnitOfWork.ts` — Unit of Work wrapping pg PoolClient transactions (BEGIN/COMMIT/ROLLBACK, always releases client)
- `src/infrastructure/database/PgPool.ts` — Pool factory function
- `src/infrastructure/database/migrations/001_create_users.sql` — DDL for users table (UUID PK, email/username unique, role/status with defaults, timestamps)
- `src/framework/config/environment.ts` — Extended with databaseUrl and jwtSecret (mandatory; throws on missing)
- `jest.setup.ts` — Injects placeholder env vars for tests that spin up the full Express app
- `jest.config.ts` — Added setupFiles pointing to jest.setup.ts
- `tests/infrastructure/` — 22 new unit tests across all four adapters

`npm run verify` passes: lint ✅ typecheck ✅ 98 tests ✅ build ✅

## Team modifications pending human review

- Confirm that `saltRounds=12` is the team's preferred bcrypt cost factor for production.
- Review the JWT expiry of `7d` — may need to be configurable via env var.
- Verify that the UPSERT strategy in `PgUserRepository.save` is acceptable vs. separate INSERT/UPDATE methods.
- Migration must be applied manually to the local and production DB before running the app — no migration runner is included yet; confirm whether the team wants to add one (e.g. `node-pg-migrate`) in a future ticket.
- `jest.setup.ts` sets placeholder DATABASE_URL and JWT_SECRET for test isolation — confirm this approach is acceptable.

## Lessons / limitations

- ESM + ts-jest requires `import type` for enum imports used only as type casts — ESLint enforces this.
- `jest.fn()` is not available as a global in ESM mode without `import { jest } from '@jest/globals'`; using hand-rolled fake classes (FakePool, FakeClient) matches the project's existing testing style and avoids this limitation.
- `loadEnvironment()` is called at module import time inside `createApp()`; adding mandatory env var checks broke existing API tests that don't set those vars. Fixed by adding `jest.setup.ts` with safe placeholder values.


---

# AI Log — AM-007 — Expose Identity HTTP API and Swagger

**Date:** 2026-06-17
**Ticket:** MAZ-78 (AM-007)
**Branch:** feat/identity-http-AM-007

## Task / problem

Expose the Identity bounded context via HTTP: add POST /auth/register and POST /auth/login endpoints, wire the DI composition in app.ts, and document both endpoints in the OpenAPI spec.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User instructed to implement ticket AM-007 (expose Identity HTTP API and Swagger), following the established workflow from claude-memory.md and compiling AI_USAGE.md after coding.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Use case contracts (RegisterUserInput/Output, LoginInput/Output) from AM-005 used as the HTTP contract | src/application/identity/use-cases/ |
| Planner/Slicer | Referenced | Dependency direction enforced: controller stays in framework, no business rules in controller | AGENTS.md §1, §8 |
| TDD Implementer | Used | Controller tests written with fake use cases before verifying green | tests/framework/identity/IdentityController.test.ts |
| Judge | Not used | N/A |
| Mutation Tester | Not used | N/A |

## Result obtained

Generated 4 files, updated 2:

- `src/framework/identity/IdentityController.ts` — Pattern: Controller. Handles POST /auth/register (201) and POST /auth/login (200); validates required fields, delegates to use cases, forwards errors to Express next().
- `src/framework/identity/identityRoutes.ts` — Express Router factory accepting an IdentityController instance.
- `src/framework/app.ts` — Updated: full DI composition wiring (PgPool → PgUserRepository, BcryptPasswordHasher, JwtTokenService, PgUnitOfWork, use cases wrapped in UseCaseLoggingDecorator + TransactionDecorator); mounts identity router.
- `src/framework/swagger/openApiSpec.ts` — Updated: added /auth/register and /auth/login paths with request/response schemas (RegisterRequest, RegisterResponse, LoginRequest, LoginResponse), all error codes documented.
- `tests/framework/identity/IdentityController.test.ts` — 9 unit tests covering register success, login success, missing fields (BadRequestError), and use case error propagation.

`npm run verify` passes: lint ✅ typecheck ✅ 107 tests ✅ build ✅

## Team modifications pending human review

- Confirm that wrapping RegisterUserUseCase in TransactionDecorator(UseCaseLoggingDecorator(...)) is the correct decorator order (transaction outermost).
- Confirm that LoginUseCase is intentionally NOT wrapped in TransactionDecorator (read-only path).
- Review request body validation in IdentityController — currently only checks for field presence; domain layer handles format/length validation.
- Swagger examples use placeholder values — team may want to refine them before delivery.

## Lessons / limitations

- `pg` Pool does not establish a connection on instantiation — only on first `pool.query()` call. This allowed wiring the real PgPool inside `createApp()` without breaking existing API tests that don't hit identity endpoints.
- Controller tests use hand-rolled fake use cases (same pattern as the rest of the test suite) — no jest.fn() needed in ESM mode.
- `identityRoutes.ts` coverage shows 66% statements because the router factory itself is never called from a test; the controller is unit-tested directly. End-to-end route coverage belongs in AM-008.


---

# AI Log — AM-008 — Complete Identity test matrix

**Date:** 2026-06-17
**Ticket:** MAZ-79 (AM-008)
**Branch:** test/identity-matrix-AM-008

## Task / problem

Close the Identity test gap left by AM-005 through AM-007: add use-case unit tests for RegisterUserUseCase and LoginUseCase (application layer), and add supertest integration tests for POST /auth/register and POST /auth/login (API layer). Provide a shared test helper to avoid duplicating Express app setup across integration test files.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User instructed to implement ticket AM-008 (complete Identity test matrix), following the established workflow from claude-memory.md, re-reading it before starting.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Use case contracts and error types from AM-005/006/007 used to drive test scenarios | src/application/identity/use-cases/, src/shared/errors/ |
| Planner/Slicer | Referenced | Tests organized in three distinct layers (helpers, application, api) matching the Clean Architecture layer boundary | tests/ directory structure |
| TDD Implementer | Used | All test files written before running verify; hand-rolled fakes used throughout to avoid jest.fn() ESM incompatibility | tests/application/identity/, tests/api/identity/ |
| Judge | Not used | N/A |
| Mutation Tester | Not used | N/A |

## Result obtained

Generated 5 files:

- `tests/helpers/createTestApp.ts` — Express app factory for integration tests. Wires IdentityController + identity router + error middleware using injected fake use cases; no real DB or JWT needed.
- `tests/application/identity/RegisterUserUseCase.test.ts` — 7 unit tests: registration success (userId format, persistence, hashed password), ConflictError on duplicate email/username, domain error on invalid email format and weak password.
- `tests/application/identity/LoginUseCase.test.ts` — 6 unit tests: access token returned on valid credentials, userId/username/role returned, UnauthorizedError on user not found / wrong password / invalid email format, ForbiddenError on suspended account.
- `tests/api/identity/register.test.ts` — 6 supertest tests: 201 on success, 400 on missing email/username/rawPassword, 409 on ConflictError from use case, 400 (INVALID_ARGUMENT) on InvalidArgumentError from use case.
- `tests/api/identity/login.test.ts` — 5 supertest tests: 200 with token on success, 400 on missing email/rawPassword, 401 on UnauthorizedError, 403 on ForbiddenError.

`npm run verify` passes: lint ✅ typecheck ✅ 131 tests ✅ build ✅ (+24 tests from 107 baseline)

## Team modifications pending human review

- Use case unit tests use `UserFactory.create()` and `User.reconstitute()` directly to build test fixtures — review that fixture construction stays aligned as the domain evolves.
- `createTestApp` omits Helmet, CORS, and Swagger middleware intentionally (not needed for route-level integration tests) — confirm this scope is acceptable.
- `LoginUseCase` test for invalid email format asserts `UnauthorizedError` (not `InvalidArgumentError`) because the use case catches the domain error and wraps it as unauthorized — review if this is the intended UX behavior.

## Lessons / limitations

- ESM + ts-jest preset: `jest.fn()` is not available as a global. All fakes are hand-rolled classes — consistent with the existing infrastructure and framework test style in this project.
- `createTestApp` allows each integration test file to inject its own fake use cases and configure error state (via public `.error` field), keeping tests isolated without spinning up real infrastructure.
- Application layer coverage reached 100% statements and 100% branches for both use cases after this ticket.


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
