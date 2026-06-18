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


---

# AI Log — AM-009 — Model Level Catalog domain

**Date:** 2026-06-17
**Ticket:** MAZ-80 (AM-009)
**Branch:** feat/level-domain-AM-009

## Task / problem

Model the Level Catalog bounded context as an authoritative definition of puzzle levels, with structural and solvability validation based on a lightweight directed graph. No gameplay engine, no mobile step-by-step mechanics.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User instructed to implement ticket AM-009 (Model Level Catalog domain) following the same workflow established in claude-memory.md.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | In-scope/out-of-scope list and acceptance criteria from MAZ-80 used to define CellType, LevelSolvabilityPolicy boundary, and what NOT to build | MAZ-80 description |
| Planner/Slicer | Referenced | Domain structured in enums → value objects → policy → aggregate, following the same layering as Identity domain | src/domain/level-catalog/ layout |
| TDD Implementer | Used | All tests written before running verify; fixed `.toBeInstanceOf()` → `.toThrow()` for synchronous throws after first verify run | tests/domain/level-catalog/ |
| Judge | Not used | N/A |
| Mutation Tester | Not used | N/A |

## Result obtained

Generated 18 source files and 8 test files:

**Enums** — `CellType` (ARROW, START, EXIT), `Direction` (8 cardinal + diagonal), `Difficulty` (EASY, MEDIUM, HARD), `LevelStatus` (DRAFT, PUBLISHED, ARCHIVED)

**Value Objects** — `LevelId` (UUID), `LevelName` (1-100 chars), `LevelDescription` (max 500 chars), `BoardSize` (2-20 rows/cols), `Position` (non-negative integers), `CellSpec` (position + type + optional direction; enforces direction rules per cell type), `LevelDefinition` (validates exactly one START, exactly one EXIT, all cells within bounds), `LevelVersion` (positive integer), `TimeLimit` (positive seconds), `MoveCount` (positive integer)

**Domain service** — `LevelSolvabilityPolicy`: follows the direction chain from START using BFS with cycle detection; returns true if EXIT is reached

**Domain event** — `LevelPublished` (levelId, name, difficulty)

**Aggregate Root** — `Level`: `draft()` factory, `reconstitute()`, `publish(policy)` (throws if not DRAFT or not solvable; emits LevelPublished), `pullDomainEvents()`

`npm run verify` passes: lint ✅ typecheck ✅ 172 tests ✅ build ✅ (+41 tests from 131 baseline)

## Team modifications pending human review

- `CellType.START` cells require a direction (the initial movement direction). This means START is not a passive marker — it has an arrow. Team should confirm this game mechanic interpretation is correct.
- `CellType.EXIT` cells have no direction. Movement terminates when the path lands on EXIT.
- `LevelSolvabilityPolicy` uses deterministic chain-following (each cell has exactly one outgoing edge). If the team wants to support branching paths in the future (multiple traversal choices), the policy will need a BFS graph approach instead.
- `LevelDescription` allows empty string. If a non-empty description is required, the validation bound needs updating.
- `Level.draft()` does not validate solvability. Solvability is only checked at publish time. Team should confirm this is acceptable.

## Lessons / limitations

- Synchronous throws must be tested with `.toThrow(ErrorClass)`, not `.toBeInstanceOf()`. `.toBeInstanceOf()` works for async rejections via `.rejects`, not for `expect(() => fn())`.
- `LevelSolvabilityPolicy` depends on `Position.create()` internally to construct the next step position. Since `Position` validates non-negative integers and the policy checks bounds before creating, this is safe.
- `MoveCount` and `TimeLimit` have 0% coverage because `Level.draft()` makes them optional and no test exercises those paths yet. Coverage will improve in AM-010 (application services).


---

# AI Log — AM-010 — Level Catalog application services

**Date:** 2026-06-17
**Ticket:** MAZ-81 (AM-010)
**Branch:** feat/level-application-AM-010

## Task / problem

Implement the application layer for the Level Catalog bounded context: repository port, six use cases (GetLevels, GetLevel, CreateLevel, PublishLevel, ArchiveLevel, UpdateLevelDefinition), and their corresponding unit tests. Also extend the Level aggregate with `archive()` and `updateDefinition()` methods required by those use cases.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User instructed to continue with AM-010 following the same established workflow (read AGENTS.md, implement, ai-log, compile-ai-usage, commit, PR, Linear).

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Acceptance criteria from MAZ-81 used to define use case boundaries and which transitions are valid (DRAFT→PUBLISHED, PUBLISHED→ARCHIVED) | MAZ-81 description |
| Planner/Slicer | Referenced | Application structured as port → use cases → tests; one use case file per operation following Identity layer conventions | src/application/level-catalog/ layout |
| TDD Implementer | Used | All tests written alongside use cases; hand-rolled FakeLevelRepository and factory helpers used instead of jest.fn() due to ESM constraints | tests/application/level-catalog/ |
| Judge | Not used | N/A |
| Mutation Tester | Not used | N/A |

## Result obtained

Extended `src/domain/level-catalog/Level.ts` with:
- `_definition` made mutable (was `readonly`)
- `updateDefinition(definition)`: validates DRAFT status before replacing definition
- `archive()`: validates PUBLISHED status before transitioning to ARCHIVED

Created `src/application/level-catalog/ports/LevelRepository.ts`:
- `save(level)`, `findById(id)`, `findAllPublished()`

Created six use cases:
- `GetLevelsUseCase` — returns all published levels as `LevelSummaryDto[]`
- `GetLevelUseCase` — returns a single level by ID as `LevelDto`; throws `NotFoundError` if absent
- `CreateLevelUseCase` — constructs all value objects from raw input and persists a new DRAFT level
- `PublishLevelUseCase` — calls `level.publish(policy)`, saves, returns level ID
- `ArchiveLevelUseCase` — calls `level.archive()`, saves, returns level ID
- `UpdateLevelDefinitionUseCase` — reconstructs `LevelDefinition` from raw input and calls `level.updateDefinition()`

Created `tests/application/level-catalog/helpers/levelFixtures.ts`:
- `FakeLevelRepository` (in-memory Map with `seed()` helper and `savedLevels` inspection array)
- `makeDraftLevel()`, `makePublishedLevel()`, `makeArchivedLevel()`, `makeSolvableDefinition()`
- `VALID_UUID` constant

Created 6 test files covering 19 test cases total.

`npm run verify` passes: lint ✅ typecheck ✅ 223 tests ✅ build ✅ (+51 tests from 172 baseline)

## Team modifications pending human review

- `GetLevelsUseCase` filters by `findAllPublished()`. If the team needs a separate admin view (e.g., list draft levels), a new use case and port method will be required.
- `UpdateLevelDefinitionUseCase` rebuilds the full `LevelDefinition` from scratch. There is no partial-update concept — all cells must be provided on every update.
- `PublishLevelUseCase` receives `LevelSolvabilityPolicy` as a constructor dependency. The concrete implementation will be wired in the framework layer (AM-011+). Team should confirm the DI approach.
- `LevelDto` and `LevelSummaryDto` are defined inline in their respective use case files. If reuse grows, they may need to be moved to a shared DTOs file.

## Lessons / limitations

- ESM + ts-jest does not allow `jest.fn()` as a global or class mock. All test doubles were hand-rolled as concrete classes or in-memory implementations, which avoids the ESM mock hoisting problem entirely.
- `LevelSolvabilityPolicy` is an abstract class, not an interface, because TypeScript interfaces cannot be subclassed in test doubles with `override` type safety. Extending the class in tests (`AlwaysSolvablePolicy`, `NeverSolvablePolicy`) keeps the type contract while enabling simple stubs.
- `import type` is required for `LevelSolvabilityPolicy` in `PublishLevelUseCase` because it is only used as a type annotation. The ESLint `consistent-type-imports` rule enforces this.


---

# AI Log - AM-033 - Model Leaderboard domain

## Task / problem
Implement the Leaderboard aggregate root and ScoreEntry entity in `src/domain` following Clean Architecture. The domain was intentionally empty pending team approval.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
User provided the approved entity structure:
- Leaderboard: id, levelId, entries, maxEntries, updatedAt, domainEvents
- ScoreEntry: id, userId, levelId, usernameSnapshot, score, timeSeconds, movesCount, rank?, submittedAt

## Result obtained
Created:
- `src/domain/shared/DomainEvent.ts` — abstract base class
- `src/domain/shared/Entity.ts` — abstract base class with domain event support
- `src/domain/leaderboard/value-objects/` — 12 value objects (LeaderboardId, LevelId, EntryId, UserId, UsernameSnapshot, Score, TimeSeconds, MoveCount, Rank, MaxLeaderboardEntries, UpdatedAt, SubmittedAt)
- `src/domain/leaderboard/ScoreEntry.ts` — entity
- `src/domain/leaderboard/Leaderboard.ts` — aggregate root with submitEntry, ranking, and capacity logic
- `src/domain/leaderboard/events/LeaderboardUpdatedEvent.ts`
- `src/domain/leaderboard/errors/LeaderboardErrors.ts`
- `tests/domain/leaderboard/Leaderboard.test.ts` — 13 tests, all passing

All tests pass. Typecheck clean.

## Ranking rule assumed
Higher score wins; ties broken by faster time. Requires team confirmation.

## Team modifications pending human review
- Confirm ranking rule (score desc, time asc).
- Confirm MaxLeaderboardEntries default value (currently 10).
- Confirm whether a user can update their entry (currently throws DuplicateEntryError).

## Lessons / limitations
- `exactOptionalPropertyTypes: true` in tsconfig requires explicit undefined exclusion for optional props in spread/copy patterns.
- Project uses ESM (`"type": "module"`); `require()` is unavailable in tests.


---

# AI Log - AM-034 - Implement Leaderboard application services

## Task / problem
Implement SubmitScoreService and GetLeaderboardService use cases in `src/application`
following the team's Clean Architecture pattern, using approved service structure.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
User provided the approved service structure:
- SubmitScoreService: leaderboardRepository, rankingService, validationService, eventBus
- GetLeaderboardService: repo (ILeaderboardRepository)

## Result obtained
Created:
- `src/application/aspects/UseCase.ts` — UseCase<Input, Output> interface
- `src/application/leaderboard/ports/ILeaderboardRepository.ts`
- `src/application/leaderboard/ports/IDomainEventBus.ts`
- `src/application/leaderboard/services/RankingService.ts`
- `src/application/leaderboard/services/ScoreValidationService.ts`
- `src/application/leaderboard/use-cases/SubmitScoreService.ts`
- `src/application/leaderboard/use-cases/GetLeaderboardService.ts`
- `src/shared/errors/AppError.ts` and `ApplicationError.ts` (aligned with identity branch)
- `tests/application/leaderboard/SubmitScoreService.test.ts` — 6 tests passing
- `tests/application/leaderboard/GetLeaderboardService.test.ts` — 3 tests passing

All 9 tests pass. Typecheck clean.

## Team modifications pending human review
- SubmitScoreService creates a new Leaderboard if none exists for the level.
  Confirm whether this is correct or if missing leaderboard should throw NotFoundError.
- IDomainEventBus references shared DomainEvent base — confirm alignment with
  identity branch's `src/domain/events/DomainEvent.ts` interface.

## Lessons / limitations
- ESM + ts-jest requires explicit `import { jest } from '@jest/globals'` in test files.
- Domain files from feat/leaderboard-domain-AM-033 were merged locally since that
  branch is not yet in main. This branch depends on AM-033 being merged first.


---

# AI Log - AM-035 - Implement Leaderboard infrastructure

## Task / problem
Implement PgLeaderboardRepository adapting ILeaderboardRepository to PostgreSQL,
following the Repository + Adapter pattern used by identity infrastructure.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
Derived from identity branch pattern (PgUserRepository, PgPool, migrations).
User confirmed service structure in AM-033 and AM-034.

## Result obtained
Created:
- `src/infrastructure/database/PgPool.ts` — pg Pool factory
- `src/infrastructure/database/migrations/002_create_leaderboards.sql`
- `src/infrastructure/leaderboard/PgLeaderboardRepository.ts` — implements ILeaderboardRepository
- `src/shared/errors/InfrastructureError.ts`
- `tests/infrastructure/leaderboard/PgLeaderboardRepository.test.ts` — 5 tests passing

All tests pass. Typecheck clean.

## Design decisions
- save() uses DELETE + INSERT for entries (full replace) inside a transaction.
  Alternative: upsert per entry. Confirm with team if partial updates are needed.
- pg is added as a runtime dependency (was missing from package.json).

## Team modifications pending human review
- Confirm migration numbering (002) does not conflict with other branches.
- Confirm save strategy (delete+insert vs upsert per entry).

## Lessons / limitations
- This branch depends on feat/leaderboard-domain-AM-033 and
  feat/leaderboard-services-AM-034 being merged first.


---

# AI Log - AM-036 - Expose Leaderboard HTTP API and Swagger

## Task / problem
Expose LeaderboardController (POST /leaderboard/scores, GET /leaderboard/:levelId),
leaderboardRoutes, and Swagger spec following the identity HTTP pattern.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
Derived from identity HTTP branch pattern (IdentityController, identityRoutes,
openApiSpec). Pre-checks: AGENTS.md both repos, MEMORY.md created, Linear tickets
AM-033/034/035 confirmed complete.

## Result obtained
Created:
- `src/framework/leaderboard/LeaderboardController.ts`
- `src/framework/leaderboard/leaderboardRoutes.ts`
- `src/framework/swagger/openApiSpec.ts` — extended with Leaderboard paths and schemas
- `src/application/aspects/sanitizeLogContext.ts` — copied from identity branch
- `src/shared/errors/index.ts` — copied from identity branch
- `src/framework/errors/ApiResponsePresenter.ts`, `errorMiddleware.ts`, `notFoundMiddleware.ts`
- `tests/framework/leaderboard/LeaderboardController.test.ts` — 5 tests passing
- MEMORY.md initialized with project context, user profile, and workflow feedback

All tests pass. Typecheck clean.

## Team modifications pending human review
- app.ts errorMiddleware fix uses inline no-op logger — wire real ConsoleLogger
  once identity branch is merged.
- Confirm route prefix convention: /leaderboard vs /api/leaderboard.

## Lessons / limitations
- Express 5 req.params type is `string | string[]`, requires explicit narrowing.
- app.ts was outdated vs identity branch — minimal fix applied, team should
  reconcile when merging both branches.
- This branch depends on AM-033, AM-034, AM-035 being merged first.


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
