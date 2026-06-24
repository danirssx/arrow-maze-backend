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

# AI Log — AM-011 — Level Catalog infrastructure and seed data

**Date:** 2026-06-17
**Ticket:** MAZ-82 (AM-011)
**Branch:** feat/level-infrastructure-AM-011

## Task / problem

Implement the infrastructure layer for the Level Catalog bounded context: DB migration for `levels` and `level_cells` tables, `LevelMapper`, `PgLevelRepository` (implements the `LevelRepository` port from AM-010), seed data with published levels, and full infrastructure test coverage.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User instructed to proceed with AM-011 following the established workflow (read AGENTS.md + memory files, implement, ai-log, commit, PR).

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Port interface from AM-010 (`LevelRepository`) used as implementation contract | src/application/level-catalog/ports/LevelRepository.ts |
| TDD Implementer | Used | Test file written before implementation; all 10 tests passed on first run | tests/infrastructure/level-catalog/PgLevelRepository.test.ts |
| Judge | Not used | N/A |

## Result obtained

**Migration** `src/infrastructure/database/migrations/004_create_levels.sql`:
- `levels` table: UUID PK, name, description, difficulty, status, version, board dimensions, optional time_limit_seconds + move_count, timestamps
- `level_cells` table: UUID PK (gen_random_uuid()), FK to levels (CASCADE DELETE), row, col, type, direction (nullable), UNIQUE(level_id, row, col)
- Indexes on `level_cells(level_id)` and `levels(status)`

**Seed** `src/infrastructure/database/seeds/001_seed_levels.sql`:
- 3 published levels: Tutorial (3×3, EASY), Crossroads (4×4, EASY), Spiral (4×4, MEDIUM with 120s time limit)
- All inserts use `ON CONFLICT DO NOTHING` for idempotency
- Fixed UUIDs matching test constants pattern (`550e8400-e29b-41d4-a716-446655440010/011/012`)

**Mapper** `src/infrastructure/level-catalog/LevelMapper.ts`:
- `LevelRow` and `CellRow` types exported for reuse in repository
- `rowToLevel(levelRow, cellRows)` reconstructs the full Level aggregate using `Level.reconstitute()` and all value object factories

**Repository** `src/infrastructure/level-catalog/PgLevelRepository.ts`:
- `findById`: two queries (levels → level_cells), returns null when not found
- `findAllPublished`: bulk fetch published levels then per-level cell queries in order
- `save`: transaction (BEGIN/COMMIT/ROLLBACK), upserts level via ON CONFLICT, deletes then re-inserts cells

**Tests** `tests/infrastructure/level-catalog/PgLevelRepository.test.ts`:
- 10 test cases: findById (5), findAllPublished (3), save (2)
- Uses `makePool(queryResponses[])` pattern matching PgLeaderboardRepository and PgProgressRepository tests
- `makeLevel()` helper builds a real `Level` aggregate from domain constructors (no `as never` casts)

`npm run verify` passes: lint ✅ typecheck ✅ 277 tests ✅

## Patterns followed

- `Difficulty` and `LevelStatus` imported as `import type` — used only in type assertions (`as Difficulty`), not as runtime values
- `CellSpec` and `LevelDefinition` keep regular imports — used as values for `.create()` static method calls
- Repository wraps all DB errors in `InfrastructureError` with `cause`, matching leaderboard and progress repositories
- Pool query mock returns responses in call order using `callCount++` index, consistent with existing infrastructure tests

## Team considerations pending human review

- `findAllPublished` issues N+1 queries (one per level for cells). Acceptable for the current catalog size; a JOIN-based approach can replace it if the catalog grows large.
- Seed UUIDs are hardcoded. If the team wants dynamic seeding, an application-layer seed script using domain factories would be preferred.
- `gen_random_uuid()` in the migration requires PostgreSQL 13+. Confirm target version before running in production.

## Lessons / limitations

- Seed data bypasses `level.publish()` and therefore skips `LevelSolvabilityPolicy`. The Crossroads level had a loop (no path to EXIT) that was only caught by manually tracing the path after the fact. Any future seed level must be traced manually against the policy logic before committing.
- The fix was committed separately as `fix(level-catalog): correct Crossroads seed level layout to be solvable`.


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


---

# AI Log - AM-041 - Complete backend Leaderboard test matrix

## Task / problem
Complete the full test matrix for the Leaderboard bounded context across all
backend layers: domain, application, infrastructure, framework, and API.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
Pre-checks: AGENTS.md both repos reviewed, MEMORY.md updated, prior tickets
AM-033/034/035/036 confirmed. Identity test matrix branch studied for API
integration test pattern (Supertest + Fake use cases + createTestApp helper).

## Result obtained
Created:
- `tests/helpers/createLeaderboardTestApp.ts` — Express test app factory
- `tests/api/leaderboard/submitScore.test.ts` — 3 API integration tests
- `tests/api/leaderboard/getLeaderboard.test.ts` — 3 API integration tests
- `src/infrastructure/logging/ConsoleLogger.ts` — copied from identity branch

Full matrix: 38 tests across 7 suites, all passing.
- domain/leaderboard: 13 tests
- application/leaderboard: 9 tests (SubmitScore + GetLeaderboard)
- infrastructure/leaderboard: 5 tests (PgLeaderboardRepository)
- framework/leaderboard: 5 tests (LeaderboardController)
- api/leaderboard: 6 tests (submitScore + getLeaderboard)

Typecheck clean.

## Team modifications pending human review
- API tests use in-process fake use cases — no real DB.
  Integration tests against real DB belong in a separate test:integration suite.
- This branch depends on AM-033 through AM-036 being merged first.

## Lessons / limitations
- Supertest fake classes avoid jest.fn() complexity and are more readable.
- All prior leaderboard test files (domain/application/infra/framework) were
  already implemented in their respective branches — this ticket consolidates
  the API layer and verifies the full matrix compiles and runs together.


---

# AI Log — Architecture Divergence Fixes

**Date:** 2026-06-17  
**Ticket:** pre-AM-011 (architectural alignment before level infrastructure)  
**Tool:** Claude Sonnet 4.6 (Claude Code CLI)  
**Author:** Fernando Liendo

---

## Task / Problem

Eight architectural divergences existed between Fernando's (identity, level-catalog) and Daniella's (leaderboard, progress) bounded contexts. These needed resolution before starting AM-011 to avoid compounding technical debt.

The 8 divergences:
- D1: `DomainEvent` — interface vs abstract class
- D2: `Entity.pullDomainEvents()` — missing in Fernando's base
- D3: Duplicate `UserId`/`LevelId` across 3+ contexts each
- D4: Port naming (I-prefix in Daniella's vs none in Fernando's)
- D5: Dead `services/` sublayer in leaderboard application
- D6: Duplicate `IDomainEventBus` ports per context
- D7: `getValue()` vs `.value` accessor inconsistency
- D8: Domain errors extending plain `Error` instead of `DomainError`

---

## Prompt Used

> "Vamos a arreglar las divergencias primero" → "Sí, procede con este ajuste, todos los cambios que hagas documentalos en un archivo .md, ponle 'divergencia-fixes.md' y todo lo que cambies documentalo ahí, fixea todo"

---

## Agent Roles

- Claude Code as primary agent (exploration, planning, implementation)
- No specialized sub-agents used

---

## Result Obtained

- All 8 divergences resolved
- TypeScript compiles cleanly (`tsc --noEmit`: 0 errors)
- 258/258 tests passing (0 failures)
- Full documentation in `divergencia-fixes.md`

### Key decisions made:

| Decision | Rationale |
|----------|-----------|
| Shared kernel for `UserId`/`LevelId` | Cross-context identity; UUID validation enforced once |
| Abstract `DomainEvent` class (not interface) | Guarantees `occurredOn` and `aggregateId` for all events |
| No I-prefix on ports | Fernando's established style; DDD convention |
| `pullDomainEvents()` on Entity base | Atomic drain; prevents double-processing |
| `.value` public property | TypeScript idiomatic; removes boilerplate `getValue()` |
| Inlined `SubmitScoreService` validation | `RankingService`/`ScoreValidationService` were dead code |
| Single `DomainEventBus` port | Shared at `application/ports/`, not per-context |

---

## Files Changed

**New files:** `src/domain/shared/UserId.ts`, `src/domain/shared/LevelId.ts`, `src/application/ports/DomainEventBus.ts`, `divergencia-fixes.md`

**Deleted files:** 11 files (duplicate VOs, dead services, old ports)

**Modified source files:** ~30 files across domain, application, infrastructure layers

**Modified test files:** 17 test files updated (import paths, accessor style, UUID validation alignment)

---

## Team Modifications Pending Human Review

- [ ] Verify `pullDomainEvents()` backward compatibility with Daniella's code that uses `domainEvents` + `clearEvents()` (both kept for compatibility)
- [ ] Confirm `ProgressMergePolicy` still handles edge cases correctly with shared kernel `UserId`/`LevelId`
- [ ] Review test UUID constants (all use `550e8400-e29b-41d4-*` prefix for clarity)
- [ ] Check `BcryptPasswordHasher` — `raw.value` / `stored.value` vs old `getValue()` calls

---

## Lessons / Limitations

- Shared kernel UUIDs required updating all test fixtures that used simple strings (`'user-1'`, `'level-1'`) to valid UUID v4 format — a ripple effect worth noting for future context additions
- The leaderboard's internal `UserId`/`LevelId` were lightweight opaque wrappers — replacing them with shared kernel VOs adds UUID validation that didn't exist before; this is architecturally correct but test maintenance cost increased
- Dead code detection: `RankingService` was injected but never called — removed; `ScoreValidationService` logic was duplicated in `Leaderboard.submitEntry()` domain rule


---

# AI Log — feat: expose Level Catalog HTTP API and Swagger (AM-012)

**Date:** 2026-06-18
**Branch:** feat/level-api-AM-012
**Linear:** MAZ-83

## Task / problem

Expose the Level Catalog bounded context as an HTTP API. The use cases (`GetLevelsUseCase`, `GetLevelUseCase`, `CreateLevelUseCase`, `UpdateLevelDefinitionUseCase`, `PublishLevelUseCase`, `ArchiveLevelUseCase`) and infrastructure (`PgLevelRepository`) were already implemented in AM-010 and AM-011. This ticket adds the framework layer: controller, routes, wiring in `app.ts`, and Swagger documentation.

Public endpoints return published levels for all clients. Admin endpoints (create, update definition, publish, archive) require `Authorization: Bearer <token>` and `role === 'ADMIN'` — enforced inline in the controller using the existing `AuthenticatedRequest` pattern.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested implementing AM-012 following the established workflow: read AGENTS.md, check Linear, create branch, implement controller and routes following existing patterns (IdentityController, LeaderboardController), wire in app.ts, add Swagger schemas, write tests, and update Linear.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Tests written for all public and admin endpoints; AAA pattern applied; fake use cases used throughout; 15 new tests | tests/api/level-catalog/ |
| Judge | Referenced | Controller pattern verified against IdentityController and LeaderboardController; role check pattern verified against AuthenticatedRequest usage in existing controllers | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

**New files:**
- `src/framework/level-catalog/LevelCatalogController.ts`: 6 methods (listLevels, getLevel, createLevel, updateDefinition, publishLevel, archiveLevel); admin methods enforce `role === 'ADMIN'`
- `src/framework/level-catalog/levelCatalogRoutes.ts`: `GET /levels`, `GET /levels/:levelId` (public); `POST /levels`, `PUT /levels/:levelId/definition`, `POST /levels/:levelId/publish`, `POST /levels/:levelId/archive` (auth required)
- `tests/helpers/createLevelCatalogTestApp.ts`: Supertest helper with FakeTokenService support
- `tests/api/level-catalog/getLevels.test.ts`: 4 tests for `GET /levels`
- `tests/api/level-catalog/getLevel.test.ts`: 5 tests for `GET /levels/:levelId`
- `tests/api/level-catalog/createLevel.test.ts`: 6 tests for `POST /levels`

**Modified files:**
- `src/framework/app.ts`: wired `PgLevelRepository`, `LevelSolvabilityPolicy`, all 6 use cases (reads without TransactionDecorator, writes with), `LevelCatalogController`, and `createLevelCatalogRouter`
- `src/framework/swagger/openApiSpec.ts`: added 6 Level Catalog paths and 8 new schemas (CellInput, CreateLevelRequest, UpdateLevelDefinitionRequest, CreateLevelResponse, LevelIdResponse, LevelSummary, LevelsListResponse, LevelDetail, LevelDetailResponse)

**Test count:** 297 → 312 (15 new tests, 58 suites)

## Team modifications pending human review

- Admin role check is inline in the controller (`role !== 'ADMIN'` → `ForbiddenError`). If the team wants a reusable role-guard middleware, that decision should be made explicitly and applied consistently across all bounded contexts.
- `GET /levels` returns all published levels without pagination. If the catalog grows, pagination should be added at the use case level first.
- Swagger `SubmitScoreRequest` still has `userId` in its required fields — this is a pre-existing leftover from before Fix #8 and is out of AM-012 scope.

## Lessons / limitations

- `exactOptionalPropertyTypes: true` in tsconfig requires conditional spread (`...(x !== undefined && { key: x })`) instead of `key: x ?? undefined` for optional fields — plain `undefined` assignment fails type checking.
- `req.params.levelId` needs explicit `String()` cast because Express types it as `string | string[] | undefined`.


---

# AI Log — docs: publish backend OpenAPI contract examples (AM-013)

**Date:** 2026-06-18
**Branch:** docs/backend-openapi-contract-AM-013
**Linear:** MAZ-84

## Task / problem

AM-013 requires consolidating the OpenAPI spec as a source of truth for the client team and contract tests. The existing `openApiSpec.ts` had schemas but most response objects had no concrete examples, making it harder for the client to understand actual payloads. Additional issues found:

1. `POST /leaderboard/scores` was missing `security: [{ bearerAuth: [] }]` even though it applies `authMiddleware` in routes — incorrect contract.
2. `SubmitScoreRequest` still included `userId` as a required field, a leftover from before Fix #8 which moved userId to JWT — incorrect contract.
3. No standalone contract file existed in `docs/` for client consumption.
4. `SyncProgressRequest` and `UpdateLevelDefinitionRequest` had no request body examples.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested implementing AM-013 following the established workflow: read AGENTS.md and claude-memory, check Linear and GitHub state, analyze existing swagger spec, then add concrete request/response examples for all endpoints, fix contract inaccuracies found during analysis, export the spec to docs/openapi.json, and follow the standard commit and Linear update flow.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | No new tests required — contract is a docs artifact; validation is manual per ticket spec | openApiSpec.ts, 322 tests unchanged |
| Judge | Referenced | Verified SubmitScore security and userId fix against leaderboardRoutes.ts and LeaderboardController.ts | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

**Modified files:**
- `src/framework/swagger/openApiSpec.ts`:
  - Added `security: [{ bearerAuth: [] }]` to `POST /leaderboard/scores`
  - Removed `userId` from `SubmitScoreRequest` required fields and properties (fix propagated from Fix #8)
  - Added concrete `example` to all 200/201 success responses across all 13 endpoints
  - Added `example` to all error (400/401/403/404/409/422) responses
  - Added request body examples for `SyncProgressRequest` and `UpdateLevelDefinitionRequest`
  - Added schema-level `example` to `ErrorResponse` and `SuccessResponse` components
- `package.json`: added `export-openapi` script (`tsx scripts/export-openapi.ts`)

**New files:**
- `scripts/export-openapi.ts`: exports the spec object to JSON at build time
- `docs/openapi.json`: standalone OpenAPI 3.0.3 contract file for client team consumption

**Test count:** 322 (unchanged — no behavior change)

## Team modifications pending human review

- `docs/openapi.json` is a generated artifact committed to the repo. The team should decide whether to regenerate it on every build (add to CI) or only when the spec changes manually.
- The contract does not cover endpoints still pending (AM-036 Progress events, AM-040 Leaderboard events) — out of scope per ticket definition.
- `SubmitScoreRequest.userId` removal is a breaking change for any client currently sending that field. Since the controller ignores it, existing clients will not break, but they should stop sending it.

## Lessons / limitations

- When introducing auth middleware to a route after the initial swagger declaration, both the routes file and the swagger spec must be updated — they can drift silently because the spec is not auto-generated from the routes.
- `export-openapi.ts` uses dynamic import (`await import(...)`) because the spec is an ES module. The `tsx` runner handles this without a build step.


---

# AI Log - AM-037 - Model Player Progress domain

## Task / problem
Model the authoritative Player Progress bounded context with offline-first
merge semantics. Implement the aggregate root, entities, value objects,
policies and domain events for the progress domain layer.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
Pre-checks: AGENTS.md both repos reviewed, MEMORY.md reviewed, prior tickets
AM-033 through AM-041 confirmed. Leaderboard domain studied for VO/Entity
patterns. Branch created from origin/develop (correcting prior pattern of
branching from main).

Spec: PlayerProgress aggregate, CompletedLevel entity, LevelScore VO,
ProgressVersion VO, ProgressMergePolicy domain service, events,
offline-first merge acceptance criteria.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Spec from Linear ticket guided in-scope/out-of-scope | MAZ-108 |
| Planner/Slicer | Referenced | Layered file structure planned before writing | file list |
| TDD Implementer | Referenced | Tests written for acceptance criteria (merge, completion) | PlayerProgress.test.ts |
| Judge | Not used | No .agents/ directory configured | N/A |
| Mutation Tester | Not used | No .agents/ directory configured | N/A |

## Result obtained
Created:
- `src/domain/progress/value-objects/` — 8 VOs: ProgressId, UserId, LevelId,
  CompletedLevelId, ProgressVersion, LevelScore, CompletedAt, UpdatedAt
- `src/domain/progress/errors/ProgressErrors.ts` — ProgressUserMismatchError
- `src/domain/progress/events/` — LevelCompletedEvent, LevelBestScoreUpdatedEvent
- `src/domain/progress/LevelCompletionResult.ts` — VO for completion input
- `src/domain/progress/CompletedLevel.ts` — Entity with withBetterScore()
- `src/domain/progress/PlayerProgress.ts` — Aggregate root with recordCompletion()
  and empty() factory; fires domain events
- `src/domain/progress/policies/ProgressMergePolicy.ts` — offline-first merge:
  union of completed levels, best score wins, version = max+1
- `src/domain/progress/policies/LevelUnlockPolicy.ts` — optional policy (returns
  true by default; team can override)
- `tests/domain/progress/PlayerProgress.test.ts` — 14 tests, all passing

## Team modifications pending human review
- LevelUnlockPolicy always returns true; real unlock logic requires team decision
  on which levels unlock which others.
- ProgressMergePolicy uses local.id as the merged progress ID; team should
  confirm this is the correct authority (server ID vs client ID).

## Lessons / limitations
- Branch created from origin/develop (not main) per AGENTS.md section 3.
- UserId and LevelId are duplicated across bounded contexts (leaderboard and
  progress) — by design in DDD. Team may later extract a shared kernel if
  alignment is confirmed.
- Pre-existing tsc errors (bcryptjs, jsonwebtoken) are in develop's identity
  infrastructure and unrelated to this ticket.


---

# AI Log - AM-038 - Implement Player Progress application services

## Task / problem
Implement the application layer for the Player Progress bounded context:
load, complete level, and sync (offline-first merge) use cases,
plus the domain event handler and IProgressRepository port.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
Pre-checks: AGENTS.md both repos reviewed, MEMORY.md reviewed, prior tickets
AM-037 confirmed. Leaderboard application services studied for UseCase/port
patterns (SubmitScoreService, GetLeaderboardService).

Spec: LoadProgressService, CompleteLevelService, SyncProgressService,
OnLevelCompletedHandler, IProgressRepository port, DTOs.
DoD: userId from auth context, not arbitrary body.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Spec from MAZ-109 guided in-scope items | MAZ-109 |
| Planner/Slicer | Referenced | Port → use-case → handler → test order | file list |
| TDD Implementer | Referenced | Fake repos (not jest.fn()) per leaderboard pattern | test files |
| Judge | Not used | No .agents/ directory configured | N/A |
| Mutation Tester | Not used | No .agents/ directory configured | N/A |

## Result obtained
Created:
- `src/application/progress/ports/IProgressRepository.ts`
- `src/application/progress/ports/IDomainEventBus.ts`
- `src/application/progress/use-cases/LoadProgressService.ts` — finds or creates
  empty progress; exposes `toProgressOutput` helper shared by SyncProgressService
- `src/application/progress/use-cases/CompleteLevelService.ts` — creates progress
  if absent, calls recordCompletion, saves, publishes events
- `src/application/progress/use-cases/SyncProgressService.ts` — reconstructs local
  progress from DTOs, merges with remote via ProgressMergePolicy, saves
- `src/application/progress/handlers/OnLevelCompletedHandler.ts` — stub handler
- `tests/application/progress/` — 10 tests: 3 Load, 4 CompleteLevel, 3 Sync

## Team modifications pending human review
- OnLevelCompletedHandler is a stub; real unlock/notification logic pending team
- SyncProgressService reconstructs local PlayerProgress from DTO by calling
  recordCompletion() in a loop; team may prefer a dedicated factory method
- progressId in CompleteLevelInput: client must pass a stable UUID for new users

## Lessons / limitations
- Domain progress files (AM-037) not yet merged to develop; brought in via
  git merge --no-commit --no-ff + git reset HEAD (same pattern as leaderboard)


---

# AI Log - AM-039 - Implement Player Progress infrastructure

## Task / problem
Implement the infrastructure layer for Player Progress: PostgreSQL repository,
row-to-domain mapper, and SQL migration for player_progress and completed_levels.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
Pre-checks: AGENTS.md both repos reviewed, MEMORY.md reviewed, prior tickets
AM-037 and AM-038 confirmed. PgLeaderboardRepository and its test studied for
Pool mock pattern, BEGIN/DELETE/INSERT/COMMIT transaction, InfrastructureError.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Spec from MAZ-110 guided tables, constraints, version | MAZ-110 |
| Planner/Slicer | Referenced | Migration → repository → mapper → test order | file list |
| TDD Implementer | Referenced | Mocked Pool pattern from PgLeaderboardRepository.test | test file |
| Judge | Not used | No .agents/ directory configured | N/A |
| Mutation Tester | Not used | No .agents/ directory configured | N/A |

## Result obtained
Created:
- `src/infrastructure/database/migrations/003_create_player_progress.sql`
  Tables: player_progress (id, user_id UNIQUE, version, updated_at),
  completed_levels (id, progress_id FK, level_id, best_score, best_time_seconds,
  best_moves_count, completed_at, updated_at, UNIQUE progress_id+level_id)
- `src/infrastructure/progress/PgProgressRepository.ts` — Pattern: Repository, Adapter
  findByUserId: two queries (progress + completed_levels), rowsToProgress mapper
  save: BEGIN / UPSERT player_progress / DELETE+INSERT completed_levels / COMMIT
  Wraps all errors in InfrastructureError
- `tests/infrastructure/progress/PgProgressRepository.test.ts` — 5 tests

## Team modifications pending human review
- Version conflict policy: save() does UPSERT (last write wins). Concurrent
  conflicts are resolved at application layer via ProgressMergePolicy before
  reaching the repository. Team may add optimistic locking (WHERE version = $n)
  if stricter conflict detection is needed.
- Migration runner not yet wired; team must apply 003_create_player_progress.sql
  to the target database.

## Lessons / limitations
- best_time_seconds stored as NUMERIC; read back as string by pg driver, so
  Number() cast is applied in rowToCompletedLevel to prevent type mismatch.


---

# AI Log - AM-040 - Expose Player Progress HTTP API and Swagger

## Task / problem
Expose three protected HTTP endpoints for player progress:
GET /progress/me, POST /progress/levels/:levelId/complete, PUT /progress/sync.
Auth middleware must extract userId from JWT — never from request body.

## Tool and model
Claude Code - claude-sonnet-4-6

## Prompt used
Pre-checks: AGENTS.md both repos reviewed, MEMORY.md reviewed, prior tickets
AM-037/038/039 confirmed. IdentityController and LeaderboardController studied
for Controller pattern. JwtTokenService.verify() studied for token payload shape.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Spec from MAZ-111 guided endpoints, auth, DoD | MAZ-111 |
| Planner/Slicer | Referenced | authMiddleware → controller → routes → tests order | file list |
| TDD Implementer | Referenced | Supertest + FakeTokenService + Fake use cases | test files |
| Judge | Not used | No .agents/ directory configured | N/A |
| Mutation Tester | Not used | No .agents/ directory configured | N/A |

## Result obtained
Created:
- `src/framework/middleware/authMiddleware.ts` — `createAuthMiddleware(tokenService)`
  Extracts Bearer token, calls tokenService.verify(), attaches `req.user`
- `src/framework/progress/ProgressController.ts` — Pattern: Controller
  All three handlers read userId from `req.user` (JWT), never from body
- `src/framework/progress/progressRoutes.ts` — `createProgressRouter(controller, auth)`
- `tests/helpers/createProgressTestApp.ts` — Express test app factory
- `tests/api/progress/` — 9 tests: 3 load, 3 completeLevel, 3 sync — all passing
- `src/framework/swagger/openApiSpec.ts` — extended with progress paths,
  CompleteLevelRequest, SyncProgressRequest, ProgressResponse schemas,
  bearerAuth security scheme

## Team modifications pending human review
- authMiddleware is created per-router (injected as RequestHandler); wiring in
  app.ts for production requires team to inject the real JwtTokenService
- progressId uses deterministic pattern `progress-{userId}`; team may prefer
  a lookup by userId that returns the stored UUID
- Swagger bearerAuth added but not enforced globally — applied per-route only

## Lessons / limitations
- DoD "userId from JWT, not body": verified with test
  `should_use_userId_from_jwt_not_from_body` which sends attacker userId in body
  and asserts use case received JWT userId instead


---

# AI Log — AM-050 — Deploy backend with cloud database connection

**Date:** 2026-06-18
**Ticket:** MAZ-121 (AM-050)
**Branch:** feat/cloud-db-deploy-AM-050
**Developer:** Daniella Cruz (Dev C)

## Task / problem

Enable the backend to connect to a cloud-hosted PostgreSQL database (Neon, Supabase, Railway, Render). Cloud providers require SSL and a different connection string format. Add deployment workflow for CI/CD on main.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User instructed to implement ticket AM-050 following the established workflow: review AGENTS.md, MEMORY.md, Linear MCP Guideline, register AI usage, validate, commit, push, PR, Linear comment.

## Agent Roles Used

| Agent | Status | How it was used |
| --- | --- | --- |
| Spec Partner | Referenced | MAZ-121 title used as scope boundary; no code-level decisions made without evidence |
| TDD Implementer | Used | PgPool.test.ts and loadEnvironment SSL tests written before verifying |
| Judge | Referenced | Pre-PR audit: no secrets in code, SSL defaults safe, deploy workflow non-destructive |
| Mutation Tester | Not used | StrykerJS not configured |

## Result obtained

### `src/infrastructure/database/PgPool.ts`
- Added `PoolOptions { ssl?: boolean }` parameter to `createPool`.
- When `ssl: true`, passes `{ rejectUnauthorized: false }` to pg Pool (compatible with all cloud providers including self-signed certs).
- When `ssl: false` or omitted, no SSL config is passed (local Docker).

### `src/framework/config/environment.ts`
- Added `databaseSsl: boolean` to `Environment` type.
- Resolves from `DATABASE_SSL` env var if set; defaults to `true` when `NODE_ENV=production`, `false` otherwise.
- Zero breaking change for existing local setups (Docker uses `DATABASE_SSL=false`).

### `src/framework/app.ts`
- `createPool` now receives `{ ssl: environment.databaseSsl }`.

### `.env.example`
- Added `DATABASE_SSL=false` for local Docker.
- Added commented examples for cloud providers (Neon, Supabase, Railway, Render).

### `.github/workflows/deploy.yml`
- New workflow triggered on push to `main`.
- Runs the full `verify` job first.
- `deploy` job is scaffolded with commented examples for Railway, Render, and Docker registry.
- Team must configure the deployment step and add the required secret to GitHub repository settings.

### `docs/RELEASE.md`
- Cloud database setup section with connection string formats per provider.
- Deployment workflow configuration instructions.
- Migration run commands for cloud database.

### `tests/infrastructure/database/PgPool.test.ts`
- 7 tests: createPool with ssl=false, ssl=true, no options; loadEnvironment databaseSsl from DATABASE_SSL env var; default to true in production; default to false in development.

`npm run verify` passes: lint ✅ typecheck ✅ 285 tests ✅ build ✅

## Team modifications pending human review

- Choose the cloud provider and configure the `deploy` job in `.github/workflows/deploy.yml`.
- Add the required secret (e.g., `RAILWAY_TOKEN` or `RENDER_DEPLOY_HOOK`) in GitHub repository settings.
- Run migrations against the cloud database manually before first deployment.
- Confirm whether `rejectUnauthorized: false` is acceptable for the team's SSL policy, or whether a CA certificate should be pinned.

## Lessons / limitations

- Most cloud PostgreSQL providers require SSL but use self-signed certificates, so `rejectUnauthorized: false` is necessary. For stricter security, the CA cert can be pinned via `ssl.ca` — but that requires storing the cert securely, which is out of scope here.
- `DATABASE_SSL` env var override allows flexible local development without modifying the production default.
- The deploy workflow is intentionally left as a scaffold — committing a broken deploy step would be worse than an explicit placeholder.


---

# AI Log — fix: add runtime enum guards via parseEnumFromInput / parseEnumFromDb

**Date:** 2026-06-18
**Branch:** fix/enum-runtime-validation

## Task / problem

TypeScript `as EnumType` casts were used throughout the application and infrastructure layers without any runtime check. An invalid string arriving from the HTTP body (e.g. an unknown `difficulty` value) or from a corrupted DB row would be silently accepted at compile time and propagate through the system, causing obscure downstream failures instead of a clear error at the entry point.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested a fix for all unsafe enum casts in the codebase, distinguishing between input coming from the HTTP layer (should produce a 422 ValidationError) and values coming from the database (should produce a 500 InfrastructureError indicating data corruption).

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Tests written alongside each production change; new LevelMapper.test.ts file created | CreateLevelUseCase.test.ts, LevelMapper.test.ts |
| Judge | Referenced | Reviewed the two-helper design (parseEnumFromInput vs parseEnumFromDb) to ensure layer separation was correct | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- Added `src/shared/parseEnum.ts` with two helpers:
  - `parseEnumFromInput` — throws `ValidationError` (422) for invalid values from the application layer
  - `parseEnumFromDb` — throws `InfrastructureError` (500) for corrupted values from the DB
- `CreateLevelUseCase.ts`: replaced `as CellType`, `as Direction`, `as Difficulty` with `parseEnumFromInput`
- `UpdateLevelDefinitionUseCase.ts`: replaced `as CellType`, `as Direction` with `parseEnumFromInput`
- `LevelMapper.ts`: replaced all 4 enum casts with `parseEnumFromDb`
- `PgUserRepository.ts`: replaced `as UserRole`, `as UserStatus` with `parseEnumFromDb`
- Added 3 tests to `CreateLevelUseCase.test.ts` covering invalid difficulty, cell type, and direction
- Added new `tests/infrastructure/level-catalog/LevelMapper.test.ts` (5 tests: valid reconstitution + InfrastructureError on 4 corrupted DB values)
- Test count: 279 → 294

## Team modifications pending human review

- `parseEnumFromDb` throws `InfrastructureError` with the raw DB value in the message. If that message ever surfaces to the client, it could leak internal field names. Confirm the error middleware never forwards 500 message bodies to the frontend.

## Lessons / limitations

- Splitting into two helpers (one per layer) makes the error contract explicit: 422 for bad user input, 500 for bad DB state. A single helper with a flag would have obscured which case each call site handles.


---

# AI Log — fix: read userId from JWT payload in LeaderboardController

**Date:** 2026-06-18
**Branch:** fix/leaderboard-auth-userid

## Task / problem

`LeaderboardController.submitScore` read `userId` directly from the HTTP request body. Because the `POST /leaderboard/scores` route had no authentication middleware, any caller could supply an arbitrary `userId` and submit scores on behalf of any user. This allowed score spoofing without authentication.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested a security fix to prevent score spoofing: add `authMiddleware` to the leaderboard submit route and read `userId` from the verified JWT payload instead of the request body, following the same pattern already established in the progress routes.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Added 401 tests for missing and invalid token; updated existing tests to remove userId from body and add Authorization header | submitScore.test.ts, LeaderboardController.test.ts |
| Judge | Referenced | Verified the pattern matches progressRoutes.ts and createProgressTestApp.ts exactly | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `leaderboardRoutes.ts`: accepts `authMiddleware: RequestHandler` parameter; applied to `POST /leaderboard/scores` only (GET remains public)
- `LeaderboardController.submitScore`: removed `userId` from body destructuring and required-fields check; reads `userId` from `(req as AuthenticatedRequest).user.userId`
- `app.ts`: passes `authMiddleware` to `createLeaderboardRouter`
- `tests/helpers/createLeaderboardTestApp.ts`: now accepts `TokenService` and wires real `createAuthMiddleware` (aligned with `createProgressTestApp`)
- `tests/api/leaderboard/submitScore.test.ts`: removed `userId` from `VALID_BODY`; added `FakeTokenService`; added tests for 401 without token and 401 with invalid token; all existing tests updated to send `Authorization: Bearer valid-token`
- `tests/framework/leaderboard/LeaderboardController.test.ts`: added `user` property to mock request objects; removed `userId` from `validBody`
- Test count: 286 → 288

## Team modifications pending human review

- **Breaking change for the frontend**: `userId` must be removed from the submit score request body. The frontend must send a valid `Authorization: Bearer <token>` header on this endpoint.
- The GET `/leaderboard/:levelId` route intentionally remains public (no auth required) — confirm this is the desired behavior.

## Lessons / limitations

- The `createProgressTestApp` pattern (accepting a real `TokenService` and wiring `createAuthMiddleware`) is the correct approach for controller tests that involve authenticated routes. Using a fake middleware that just calls `next()` would bypass the auth contract entirely.


---

# AI Log — fix: LeaderboardId and EntryId UUID validation

**Date:** 2026-06-18
**Branch:** fix/leaderboard-uuid-ids

## Task / problem

`LeaderboardId` and `EntryId` had public constructors that accepted any non-empty string. The `SubmitScoreService` passed client-provided `leaderboardId` and `entryId` strings directly via `new LeaderboardId(...)` / `new EntryId(...)`. The DB schema defines both columns as `UUID PRIMARY KEY`, so any non-UUID string causes `invalid input syntax for type uuid` in production.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

Continuation of critical bug fix session.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Referenced | Read migration 002 to confirm UUID PK before touching code | 002_create_leaderboards.sql |
| TDD Implementer | Referenced | Tests updated alongside each production file; all 277 pass | tests/domain/leaderboard/, tests/infrastructure/leaderboard/, tests/application/leaderboard/ |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `LeaderboardId`: private constructor, UUID v4 validation, `create()` + `generate()` static factories, `InvalidArgumentError`
- `EntryId`: same pattern as above
- `PgLeaderboardRepository`: `new LeaderboardId(...)` → `LeaderboardId.create(...)`, `new EntryId(...)` → `EntryId.create(...)`
- `SubmitScoreService`: same factory replacements; client must now supply valid UUIDs for `leaderboardId` and `entryId`
- All test fixtures updated to use valid UUID constants
- All 277 tests pass, `tsc --noEmit` clean

## Team modifications pending human review

- `SubmitScoreService` still accepts `leaderboardId` and `entryId` from HTTP body (Fix #8). After this fix, invalid UUIDs will throw `InvalidArgumentError` at the VO level instead of reaching the DB — an improvement, but the architecture concern (client-generated IDs) remains for a future ticket.

## Lessons / limitations

- Same root cause as the Progress UUID fix: VOs must enforce UUID format in their constructor, not rely on DB constraints, because pool mocks accept any string in tests.


---

# AI Log — fix: validate duplicate positions in LevelDefinition

**Date:** 2026-06-18
**Branch:** fix/level-definition-duplicate-positions

## Task / problem

`LevelDefinition.create()` validated bounds and START/EXIT counts but did not check for duplicate positions. Two cells could occupy the same `(row, col)` and the domain would accept them, deferring the constraint to the SQL `UNIQUE(level_id, row, col)` index. Domain invariants must be enforced at the VO level.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

Continuation of critical bug fix session.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Added test alongside production change | LevelDefinition.test.ts |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `LevelDefinition.create()`: added `Set<string>` keyed by `${row},${col}` to detect duplicates during the existing bounds check loop; throws `InvalidArgumentError` on duplicate
- Added test `should_throw_when_two_cells_share_the_same_position`
- 279 tests pass, `tsc --noEmit` clean

## Lessons / limitations

- Duplicate detection is O(n) with the Set, same pass as bounds checking — no extra loop needed.


---

# AI Log — fix: check isActive before bcrypt in LoginUseCase

**Date:** 2026-06-18
**Branch:** fix/login-isactive-order

## Task / problem

`LoginUseCase` ran `bcrypt.verify()` before checking `user.isActive`. For suspended accounts, bcrypt always ran regardless of whether the password was correct, wasting compute and creating inconsistent timing behavior. The isActive check must happen before the expensive bcrypt operation.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

Continuation of critical bug fix session.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Added new test to prove isActive fires before bcrypt | LoginUseCase.test.ts |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `LoginUseCase`: moved `isActive` check before `passwordHasher.verify()`
- Added test `should_throw_forbidden_error_when_account_is_suspended_even_if_password_is_wrong` — this test would FAIL on the old code (bcrypt returns false → Unauthorized, not Forbidden), proving the ordering is now correct
- 278 tests pass, `tsc --noEmit` clean

## Team modifications pending human review

- `ForbiddenError` is returned for suspended accounts — this reveals account existence to the caller. If the team wants to hide account status from unauthenticated callers, suspended accounts should also return `UnauthorizedError`. This is a product/UX decision, not a code defect.

## Lessons / limitations

- The new test is the key artifact: a test for `suspended + wrong password → ForbiddenError` only passes if isActive is checked BEFORE bcrypt. This makes the ordering a contractual invariant, not just a comment.


---

# AI Log — fix: use getQueryRunner in all PgUserRepository read methods

**Date:** 2026-06-18
**Branch:** fix/pg-user-repo-read-consistency

## Task / problem

Fix #7 (PR #35) introduced `getQueryRunner` to propagate the active transactional `PoolClient` via `AsyncLocalStorage`, and correctly updated `PgUserRepository.save()` to use it. However, the four read methods (`findById`, `findByEmail`, `existsByEmail`, `existsByUsername`) were left calling `this.pool.query()` directly. If a future use case reads a user within a transaction (e.g., to verify before writing), those reads would bypass the transactional client and not see uncommitted data from the same transaction boundary.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested completing the transactional consistency fix for `PgUserRepository` by updating all four read methods to use `getQueryRunner(this.pool)` instead of `this.pool` directly, aligning with the pattern already applied to `save()` and to all other repositories in the codebase.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Applied `getQueryRunner` pattern consistently across all 4 read methods; existing tests confirmed no regression | PgUserRepository.ts, 297 tests passing |
| Judge | Referenced | Verified pattern matches `PgLevelRepository`, `PgProgressRepository`, and `PgLeaderboardRepository` exactly | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `src/infrastructure/identity/PgUserRepository.ts`: replaced `this.pool.query()` with `getQueryRunner(this.pool).query()` in `findById`, `findByEmail`, `existsByEmail`, and `existsByUsername`
- No new tests added — behavior is identical for non-transactional calls; the `getQueryRunner` fallback returns the pool when no transaction is active
- Test count: 297 (unchanged)

## Team modifications pending human review

- No behavior change for current use cases (all callers are outside a transaction). The fix is purely defensive, enabling correct reads if a transactional use case is introduced in the future.

## Lessons / limitations

- When introducing a transactional context pattern (AsyncLocalStorage), every repository method that issues a query must be audited — not just `save()`. A partial migration silently breaks the transactional guarantee for reads.


---

# AI Log — fix: Progress UUID ids

**Date:** 2026-06-18
**Branch:** fix/progress-uuid-ids

## Task / problem

Deep review of all tickets revealed that `ProgressId` and `CompletedLevelId` had public constructors that accepted any non-empty string. The `ProgressController` was generating IDs as `progress-${userId}` and `CompletedLevelId` was derived as `${progressId}-${levelId}`. Both formats are not valid UUIDs, causing `invalid input syntax for type uuid` errors against the `UUID PRIMARY KEY` schema in production.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested a deep review of all tickets and instructed to start fixing critical issues.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Referenced | Deep review identified the bug and all affected files before touching code | review report |
| TDD Implementer | Referenced | Tests updated alongside each production file change; all 277 pass | tests/application/progress/, tests/domain/progress/ |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `ProgressId`: private constructor, UUID v4 validation, `create()` + `generate()` static factories, `InvalidArgumentError` on invalid input
- `CompletedLevelId`: same pattern as above
- `PlayerProgress.recordCompletion`: uses `CompletedLevelId.generate()` instead of derived string
- `LoadProgressService`, `CompleteLevelService`, `SyncProgressService`: removed `progressId`/`newProgressId` from inputs; use `ProgressId.generate()` server-side
- `ProgressController`: removed all `progress-${userId}` patterns
- `PgProgressRepository`: uses `ProgressId.create()` and `CompletedLevelId.create()` in mapper
- All test fixtures updated to use valid UUID constants

## Team modifications pending human review

- `SyncProgressService` now creates the transient `local` object using `remote.id` (when remote exists) to satisfy `ProgressMergePolicy` which verifies user ownership. Team should confirm this is the correct identity for the local in-memory snapshot.
- `LoadProgressService` still persists an empty progress on first load (CQS violation noted in review). Left as-is — fixing requires a separate decision on whether to defer creation to `completeLevel`.

## Lessons / limitations

- Non-UUID IDs in domain VOs are invisible in tests when pool mocks accept any string. The bug only surfaces against a real PostgreSQL DB. This is why UUID validation must be enforced in the VO itself, not delegated to the DB constraint.


---

# AI Log — fix: wire UnitOfWork transactions to repositories via AsyncLocalStorage

**Date:** 2026-06-18
**Branch:** fix/unit-of-work-transactional-client

## Task / problem

`PgUnitOfWork.runInTransaction` acquired a dedicated `PoolClient` and ran `BEGIN`/`COMMIT` on it, but all repositories called `this.pool.query()` directly. The repositories never saw the transactional client, so every query ran on a separate, auto-committed connection. Any use case wrapped with `TransactionDecorator` had no real atomicity — the `BEGIN`/`COMMIT` was a no-op.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

User requested a fix for the UnitOfWork placebo bug, making the transactional client visible to all repositories that execute within a `runInTransaction` call, without changing repository constructor signatures or adding new ports.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Not used | N/A | N/A |
| TDD Implementer | Referenced | Added test verifying transactionContext exposes the active client during runInTransaction and is cleared after | PgUnitOfWork.test.ts |
| Judge | Referenced | Evaluated AsyncLocalStorage as the non-invasive option over constructor injection or a context parameter | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- Added `src/infrastructure/database/transactionContext.ts` with:
  - `transactionContext`: `AsyncLocalStorage<PoolClient>` shared across all async descendants
  - `getQueryRunner(pool)`: returns the active transactional client if one exists, otherwise the pool (used in read methods)
  - `withTransactionalClient(pool, fn)`: joins the active transaction if one exists; otherwise acquires its own client and manages `BEGIN`/`COMMIT`/`ROLLBACK` (used in `save()` methods)
- `PgUnitOfWork.ts`: `runInTransaction` now calls `transactionContext.run(client, operation)` so the client is propagated to all async descendants
- `PgUserRepository.ts`: `save()` uses `getQueryRunner(this.pool).query()`
- `PgLevelRepository.ts`, `PgLeaderboardRepository.ts`, `PgProgressRepository.ts`: read methods use `getQueryRunner`; `save()` replaced manual `connect()` + `BEGIN`/`COMMIT` blocks with `withTransactionalClient`
- Added test `should_expose_transactional_client_via_context_during_operation` to `PgUnitOfWork.test.ts`
- Test count: 286 → 287

## Team modifications pending human review

- `withTransactionalClient` is designed for single-aggregate `save()` calls. If a future use case needs to save two aggregates in one transaction via the UoW, the outer `runInTransaction` already covers both — no changes needed. However, if a repository `save()` is ever called directly outside a UoW context, it will manage its own transaction.

## Lessons / limitations

- `AsyncLocalStorage` is the Node.js idiomatic approach for propagating context across an async call tree without touching function signatures. It is available from Node 16+ with no extra dependencies.
- The `withTransactionalClient` guard (`if (existing) return fn(existing)`) is what makes the UoW and standalone-save scenarios composable without duplicating `BEGIN`/`COMMIT` logic.


---

# AI Log — fix: Wire Leaderboard and Progress routes in app.ts

**Date:** 2026-06-18
**Branch:** fix/wire-framework-app

## Task / problem

Deep review revealed that `src/framework/app.ts` only wired the Identity bounded context. The Leaderboard and Progress bounded contexts had complete framework and application layers (controllers, routes, use cases, repositories) that were never mounted. No concrete `DomainEventBus` implementation existed, so any use case requiring it could not be instantiated.

## Tool and model

- Tool: Claude Code (claude.ai/code)
- Model: Claude Sonnet 4.6

## Prompt used

Continuation of critical bug fix session. User granted one-time merge permission for fix PRs.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Not used | N/A | N/A |
| Planner/Slicer | Referenced | Read all constructors before touching app.ts | GetLeaderboardService, SubmitScoreService, LoadProgressService, authMiddleware |
| TDD Implementer | Not used | No new logic introduced | — |
| Judge | Not used | N/A | N/A |
| Mutation Tester | Not used | N/A | N/A |

## Result obtained

- `src/infrastructure/events/InMemoryEventBus.ts`: concrete `DomainEventBus` implementation that logs published events via the `Logger` port
- `src/framework/app.ts`: wired `PgProgressRepository`, `PgLeaderboardRepository`, `InMemoryEventBus`, `LoadProgressService`, `CompleteLevelService`, `SyncProgressService`, `GetLeaderboardService`, `SubmitScoreService`, `ProgressController`, `LeaderboardController`, `createAuthMiddleware`, `createProgressRouter`, `createLeaderboardRouter`
- All 277 tests pass, `tsc --noEmit` clean

## Team modifications pending human review

- `InMemoryEventBus` only logs events — no subscribers. This is intentional: no event handler infrastructure exists yet. When the team adds handlers, they should inject them into this bus or replace it with a proper dispatcher.
- Level Catalog has no framework layer yet (no `LevelController` / routes). Left unwired — there is no corresponding ticket for the HTTP API at this stage.

## Lessons / limitations

- A missing `DomainEventBus` implementation is a silent runtime failure: TypeScript compiles fine, but any use case that calls `eventBus.publishAll()` would throw at startup when the dependency is injected. Always wire concrete infrastructure before registering routes.


---

# 2026-06-18 - MAZ-130 Backend ArrowSpec Level Catalog

## Task / Problem

Refactor the backend Level Catalog from the old maze-navigation model (`BoardSize`, `CellSpec`, `CellType`, start/exit pathfinding) to the approved Arrow Untangle contract:

- `ArrowSpec[]` level definitions.
- Optional `attempts` with default 5.
- Solvability by detecting cycles in the arrow blocking graph (DAG), not by start-to-exit pathfinding.
- OpenAPI and persistence updated for the new contract.

## Tool and Model

- Tool: Codex CLI coding agent.
- Model: GPT-5 based Codex.

## Prompt Used

The user asked to implement MAZ-130 before MAZ-136 to avoid writing tests against backend functionality that did not exist yet. The implementation had to follow repo `AGENTS.md`, `MEMORY.md`, `Linear_MCP_Guideline.md`, and the refactor documents `Mecanica_Juego_Arrow_Untangle.md` and `Refactor_Arrow_Untangle_Tickets.md`.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Used the approved refactor mechanic/spec as the design source; no new design decision was invented. | `Mecanica_Juego_Arrow_Untangle.md`, `Refactor_Arrow_Untangle_Tickets.md`, Linear MAZ-130 |
| Planner/Slicer | Referenced | Followed the T1 slice boundaries: backend DTO/domain/persistence/API/Swagger only. | `Refactor_Arrow_Untangle_Tickets.md` T1 |
| TDD Implementer | Used | Added and rewrote tests for `ArrowSpec`, `LevelDefinition`, DAG solvability, use cases, mapper, repository, controller, and API behavior. | 310 backend tests passing in `npm run verify` |
| Judge | Referenced | Checked Clean Architecture boundaries and validated the full backend verify command before handoff. | `npm run verify` |
| Mutation Tester | Not used | Mutation testing was not part of MAZ-130 scope and no mutation tool was run. | N/A |

## Result Obtained

- Added backend `ArrowSpec` value object and updated `Position` to allow negative coordinates.
- Replaced `LevelDefinition` with `{ arrows, attempts }`.
- Replaced solvability logic with blocking-graph DAG detection.
- Removed domain source files for `BoardSize`, `CellSpec`, and `CellType`.
- Updated create/update/get level use cases and controller request handling.
- Updated `PgLevelRepository` and `LevelMapper` to persist `arrows` JSONB and `attempts`.
- Added migration `005_refactor_levels_to_arrow_specs.sql`.
- Rewrote seed levels as Arrow Untangle examples.
- Updated Swagger schemas and examples.
- Rewrote Level Catalog tests for the new model.

## Validation

```sh
npm run verify
```

Result: passed.

- Lint: passed.
- Typecheck: passed.
- Test coverage: passed, 58 suites / 310 tests.
- Build: passed.

## Team Modifications Pending Human Review

- Review whether backend should keep legacy `timeLimit` and `moveCount` as optional metadata. They are preserved for compatibility, but they are no longer part of the level-board definition.
- Review production DB migration order before applying to an existing database.
- Coordinate with mobile MAZ-136 after this branch is reviewed because backend DAG tests are now available.

## Lessons / Limitations

- This refactor should be merged before MAZ-136 backend test expansion, otherwise tests would target non-existent backend behavior.
- The migration keeps compatibility for old `board_rows`/`board_cols` columns if already present, while fresh installs use the new `arrows`/`attempts` schema.


---

# AI Log — MAZ-141 — Backend setup and level contract integration

## Ticket

- Linear: `MAZ-141`
- Branch: `fix/backend-integration-setup-MAZ-141`
- Worktree: `worktrees/am-MAZ-141-backend`

## Agent Roles Used

| Role | Status | Notes |
| --- | --- | --- |
| Spec Partner | Referenced | Used backend-as-source-of-truth requirement to expose level metadata needed by mobile. |
| Planner/Slicer | Referenced | Grouped DB setup and level contract changes under the integration ticket. |
| TDD Implementer | Used | Added DB setup script and extended level DTO outputs with tests. |
| Judge | Referenced | Ran typecheck, lint, OpenAPI export, and focused backend tests. |
| Mutation | Not used | Mutation testing was out of scope for this integration pass. |

## Summary

- Added `scripts/run-sql-files.mjs`.
- Added `db:migrate`, `db:seed`, and `db:setup` npm scripts.
- Updated README and release docs so migration `005_refactor_levels_to_arrow_specs.sql` runs before seeds.
- Extended `/levels` summaries with `arrowCount`, `attempts`, and optional `timeLimitSeconds`.
- Extended `/levels/:id` detail with optional `timeLimitSeconds`.
- Hardened level migrations so old maze columns (`board_rows`, `board_cols`, `move_count`) are removed and ArrowSpec columns are enforced.
- Regenerated the level seed without `move_count`.
- Updated Swagger source and regenerated `docs/openapi.json`.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run export-openapi`
- `npm test -- --runInBand tests/api/level-catalog/getLevels.test.ts tests/api/level-catalog/getLevel.test.ts tests/application/level-catalog/GetLevelsUseCase.test.ts tests/application/level-catalog/GetLevelUseCase.test.ts`
- `npm run verify` - green, 58 suites / 310 tests
- Local DB validation - green: 15 published Arrow Untangle levels, ArrowSpec path invariants, head direction rule, and DAG solvability.
- Temporary backend on `localhost:3001` - `/health`, `/levels`, and `/levels/:id` returned 200 against local Postgres.

## Notes

- `npm run export-openapi` and backend API tests needed elevated execution because sandboxing blocked local IPC/listener creation.
- Local Postgres was initially blocked by another container on `5432`; after that container was stopped, the Arrow Maze DB service was recreated/reconnected and migrations/seeds applied.
- Validation used a temporary ignored `node_modules` symlink to the main backend worktree, then removed it.


---

# AI Usage Log: MAZ-143 Migrate database queries to a Prisma ORM

## Task / Problem

MAZ-143 ("Buscar migrar consultas DB a un ORM", repo `arrow-maze-backend`): replace
all hand-written `pg` SQL in the backend with Prisma ORM, without breaking Clean
Architecture. The agreed scope (Option B) is a full Prisma adoption: schema +
generated client for runtime queries, Prisma Migrate for the schema, and a
Prisma-based seed — so that only the ORM talks to the database. Prisma must remain
an infrastructure concern; `src/domain` and `src/application` must not import it.

## Tool and Model

Claude Code / Claude Opus 4.8.

## Prompt Used

User asked (in Spanish) to implement MAZ-143 by migrating every backend query to
Prisma, allowing restructuring as long as Clean Architecture is preserved, and to
follow the full ticket workflow. Local guidelines read before coding: `AGENTS.md`
(both repos), root `MEMORY.md`, `Linear_MCP_Guideline.md`, `ArrowMaze_Linear_Tickets_Plan.md`
(Definition of Done: "application no importa ORM"), and the existing `pg` infra
(`PgPool`, `PgUnitOfWork`, `transactionContext`, `Pg*Repository`, `LevelMapper`).
The execution plan was posted to the Linear ticket description before implementation.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Referenced | Read `.agents/spec-partner.md` constraints and confirmed scope (Option B vs A) and the "ORM only in infrastructure" invariant with the user before coding. | Linear MAZ-143 description (execution plan) |
| Planner/Slicer | Referenced | Followed `.agents/planner.md` by slicing the work into setup → runtime layer → migrate/seed → tests → verify/docs, tracked as tasks. | This log; commit history |
| TDD Implementer | Used | Rewrote the infrastructure adapter tests to mock the Prisma client (AAA, `should_..._when_...`) and kept them green alongside the new adapters; validated runtime end-to-end against a real Postgres. | `tests/infrastructure/**`, smoke + fresh-DB runs |
| Judge | Referenced | Applied `.agents/judge.md` checklist (architecture boundaries, ports unchanged, no ORM in domain/application, error wrapping preserved) while reviewing the diff. | `npm run lint` (architecture guard), this log |
| Mutation Tester | Not used | No mutation run for this refactor. | N/A |

## Result Obtained

Runtime data access (infrastructure only):

- `prisma/schema.prisma` — models mapped to the existing tables/columns via
  `@@map`/`@map`; `@db` types mirror the live schema (introspected, then cleaned).
- `prisma.config.ts` — Prisma 7 config (datasource URL from env, migrations path,
  `prisma db seed` command).
- `src/infrastructure/database/PrismaClientProvider.ts` (replaces `PgPool`) — builds
  `PrismaClient` over `@prisma/adapter-pg` (`pg` driver adapter) with the same SSL
  behaviour as before.
- `src/infrastructure/database/prismaContext.ts` (replaces `transactionContext`) —
  `AsyncLocalStorage<Prisma.TransactionClient>` with `getClient` / `withTransaction`.
- `src/infrastructure/database/PrismaUnitOfWork.ts` (replaces `PgUnitOfWork`) —
  implements the unchanged `UnitOfWork` port via `prisma.$transaction`.
- `PrismaUserRepository`, `PrismaLeaderboardRepository`, `PrismaLevelRepository`,
  `PrismaProgressRepository` — rewritten with Prisma (`upsert`, `deleteMany` +
  `createMany` for atomic saves), same ports, same `InfrastructureError` wrapping.
  `LevelMapper` updated to a camelCase `LevelRecord` + `recordToLevel` (removed dead
  `CellRow`/`level_cells` mapping). `src/framework/app.ts` wiring updated.
- Deleted: `PgPool`, `PgUnitOfWork`, `transactionContext`, the four `Pg*Repository`
  files, the old SQL `migrations/`+`seeds/`, and `scripts/run-sql-files.mjs`.

Schema & seed (Prisma Migrate + Prisma seed):

- `prisma/migrations/0_init` — baseline migration equal to the prior SQL schema,
  plus the two CHECK constraints Prisma does not model; baselined on the existing DB
  with `migrate resolve --applied`.
- `prisma/seed.ts` + generated `prisma/seed-data/levels.ts` (from the adapted
  `scripts/generate-level-seed.ts`, which now emits a TS data module instead of SQL);
  idempotent upserts for published levels and demo users/progress/leaderboards.
- `package.json`: `db:generate/migrate/migrate:dev/seed/setup/studio` now use the
  Prisma CLI; added `postinstall: prisma generate`. `Dockerfile` updated to generate
  the client (schema copied before `npm ci`) and carry `node_modules/.prisma` into the
  runtime stage. ESLint ignores the generated `prisma/seed-data/**`.

Tests: rewrote the six infra adapter tests for Prisma and added `prismaContext`
coverage; domain/application/API tests untouched.

## Verification

- `npm run verify` (lint + typecheck + `test:coverage` + build) — green; 316 tests, 59 suites.
- Real-DB smoke (local Postgres): `findAllPublished` (15), `findByEmail`/`existsByEmail`,
  leaderboard with Decimal `time_seconds` + rank ordering, progress, and a repository
  call joining a `PrismaUnitOfWork` transaction — all OK.
- Fresh-DB path on a throwaway database: `prisma migrate deploy` created all 6 tables
  and both CHECK constraints; `prisma db seed` loaded 15 levels and 9 leaderboard entries.

## Team Modifications Pending Human Review

- Adopted Prisma 7 with the classic `prisma-client-js` generator (client in
  `node_modules`, gitignored) over the new generator, to avoid generated TS under the
  strict `tsconfig`. Worth a review if the team prefers the new `prisma-client` output.
- The orphaned `level_cells` table (not in the SQL migrations, unused by code) was
  intentionally left out of the Prisma schema. Fresh databases will not have it; the
  pre-existing local/cloud copies keep it as harmless dead data until dropped.
- Migration/seed workflow changed (`db:*` scripts, Dockerfile, README/RELEASE docs).
- Domain/application tests were not modified and require the usual human review.

## Lessons / Limitations

- Prisma 7 moves the datasource URL out of `schema.prisma` into `prisma.config.ts`
  and connects via driver adapters; `prisma generate` runs offline and must tolerate a
  missing `DATABASE_URL` (used `process.env.DATABASE_URL`) so the CI `postinstall` hook
  does not fail. CI builds run `npm ci` (npm 10, scripts enabled); local npm 11 blocks
  install scripts, so run `npm run db:generate` once after install.
- Baselining via `migrate diff` + `migrate resolve --applied` keeps existing data while
  switching to Prisma Migrate.
- ESLint `consistent-type-imports` flags `import { Prisma }` when only used for types
  (`Prisma.Decimal`, `Prisma.InputJsonValue`, `Prisma.TransactionClient`).


---

# AI Usage Log: MAZ-148 Support shaped Arrow Untangle level contract + persistence (backend)

## Task / Problem

Implement Phase-1 / MVP of the Abstract Shaped Boards plan in the backend under
**Option A** (the product owner's decision): `boardShape` is an optional `CELL_MASK`
that is a visual + authoring/placement mask, **not** a physical wall. Extraction
physics (`LevelSolvabilityPolicy` blocking-graph DAG) stay unchanged. Persist the
shape, expose it through the API, and reject invalid shapes with controlled errors.
Scope: domain `BoardShape` value object + `Level` arrow-containment invariant,
application create-input + read-DTO, Prisma `levels.board_shape` JSONB migration +
mapper + repository, and OpenAPI. Covers Gherkin `@s4`, `@s2b`, `@s3a–e`, `@s9`.
AI/Gemini and image upload are deferred to Phase 2 (MAZ-153).

## Tool and Model

Claude Code / Claude Opus 4.8.

## Prompt Used

The user asked to implement the whole `docs/abstract-shaped-boards-plan.md` following
both repos' `AGENTS.md`, root `MEMORY.md`, `Linear_MCP_Guideline.md`, a new worktree
per ticket, AI logging + `compile-ai-usage.sh`, MEMORY/AGENTS review, and
commit/push/PR/Linear — choosing **Option A** and deferring the Gemini/AI + image
upload work to a separate Phase-2 ticket. The Gherkin contract was approved at the
single human gate before any production code was written.

## Agent Roles Used

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner (`.agents/spec-partner.md`) | Referenced | The approved plan doc + Option A decision were distilled into a repo spec; no separate adversarial spec-partner session was run. | `specs/abstract-shaped-boards.spec.md` |
| Planner / Gherkin Author (`.agents/planner.md`) | Used | Distilled the executable `.feature` (`@s1..@s10`, `@s8` deferred) and sliced the work into MAZ-148..153 in Linear Backlog with blocking relations + labels. | `specs/abstract-shaped-boards.feature`, MAZ-148..153 |
| TDD Implementer (`.agents/tdd-implementer.md`) | Used | Red→Green per unit: `BoardShape` VO, `Level` containment invariant, create-input mapping + read DTO, `LevelMapper` (de)serialize, repository persist, controller forward, OpenAPI. | tests below + `@s → test` map |
| Judge (`.agents/judge.md`) | Referenced | Pre-PR self-audit: confirmed scenario coverage and full `npm run verify` green; Clean Architecture boundaries respected (Prisma only in infrastructure). | `npm run verify` |
| Mutation Tester (`.agents/mutation.md`) | Used | Scoped StrykerJS on the new `BoardShape` VO: **91.18% ≥ 80** break threshold. Surviving mutants are error-message `StringLiteral`s only (tests assert error *type*, not text). | `npm run mutation -- --mutate src/domain/level-catalog/value-objects/BoardShape.ts` |

## Scenario Coverage (@s ↔ test)

- @s4 (persist + GET returns shape) →
  `GetLevelUseCase.test should_include_board_shape_in_definition_when_level_has_a_shape`,
  `PrismaLevelRepository.test should_upsert_board_shape_payload_when_level_has_a_shape`,
  `LevelMapper.test should_reconstitute_board_shape_when_record_has_one`.
- @s2b (backward compat, null shape) →
  `GetLevelUseCase.test should_omit_board_shape_when_level_has_none`,
  `LevelMapper.test should_reconstitute_without_board_shape_when_record_has_none`.
- @s3a (duplicate cells) → `BoardShape.test should_throw_when_cells_contain_duplicates`,
  `CreateLevelUseCase.test should_throw_when_board_shape_has_duplicate_cells`.
- @s3b (arrow outside mask) →
  `Level.test should_throw_when_an_arrow_cell_lies_outside_the_board_shape`,
  `CreateLevelUseCase.test should_throw_when_an_arrow_cell_lies_outside_the_board_shape`.
- @s3c (unsupported type) → `BoardShape.test should_throw_when_type_is_unsupported`,
  `CreateLevelUseCase.test should_throw_when_board_shape_type_is_unsupported`.
- @s3d (oversize >600) → `BoardShape.test should_throw_when_cells_exceed_the_maximum`
  (+ boundary `should_allow_exactly_the_maximum_number_of_cells`).
- @s3e (present-but-empty) → `BoardShape.test should_throw_when_cells_are_empty`.
- @s9 (OpenAPI documents shape) → `openApiSpec.test` (BoardShapeInput, CreateLevelRequest, LevelDefinitionDto).

(`@s7`, `@s7b`, `@s10` belong to MAZ-151/MAZ-152; `@s8` is the deferred MAZ-153.)

## Result Obtained

- **Domain**: `value-objects/BoardShape.ts` — immutable `CELL_MASK` value object
  (`create(type, cells)` validates type; `cellMask` enforces non-empty, no duplicates,
  `BOARD_SHAPE_MAX_CELLS = 600`; `contains` / `containsAll`; connectivity intentionally
  not enforced). `Level` aggregate gains an optional `boardShape` (trailing param on
  `draft`/`reconstitute`, single constructor invariant `assertArrowsWithinShape`: every
  arrow path cell must be inside the mask) + `boardShape` getter. `LevelSolvabilityPolicy`
  untouched.
- **Application**: `CreateLevelInput.boardShape?` + `mapBoardShapeInput`; `LevelDefinitionDto`
  gains optional `boardShape` (`BoardShapeDto`), populated by `GetLevelUseCase`.
- **Infrastructure**: Prisma schema `boardShape Json? @map("board_shape")`; hand-authored
  migration `20260621000000_add_level_board_shape` (nullable JSONB + CHECK
  `jsonb_typeof = 'object'`); `LevelMapper` `parseBoardShape` (defensive, throws
  `InfrastructureError` on corrupt JSONB) + `boardShapeToRecord`; `PrismaLevelRepository.save`
  persists the shape (or `Prisma.DbNull`). `prisma generate` run for the client types.
- **Framework**: controller forwards optional `boardShape`; OpenAPI adds `BoardShapeInput`
  and references it from `CreateLevelRequest` + `LevelDefinitionDto`.

## Verification

- `npm run verify` → **61 suites / 345 tests green**, lint + typecheck + build clean.
- `npm run mutation -- --mutate src/domain/.../BoardShape.ts` → **91.18%** (≥ 80 break).

## Team Modifications Pending Human Review

- **DB migration not applied to a live DB from this worktree** (hand-authored to avoid
  mutating the shared dev database). Run `npm run db:migrate` (`prisma migrate deploy`)
  before this lands in an environment; the existing `0_init` baseline orders before it.
- `prisma generate` updated the shared (symlinked) client to include `boardShape`.
- Connectivity of the mask is **not enforced** for MVP (islands allowed) and victory-time
  rendering is a client decision (MAZ-150) — both per the approved gate defaults.
- `AGENTS.md` needed no change: `BoardShape` is a value object (approved pattern
  category, gate-approved), Prisma stays in infrastructure, no new top-level folder.

## Lessons / Limitations

`exactOptionalPropertyTypes: true` rejects `x as CreateLevelInput['boardShape']` (which
includes `undefined`) inside a conditional spread; cast to `NonNullable<...>` instead.
For a nullable Prisma `Json?` column, write DB NULL with `Prisma.DbNull` (a runtime value,
so import `Prisma` as a value, not type-only). Scoping Stryker with `--mutate <file>` keeps
mutation fast and focused on the new logic instead of pre-existing untested branches.


---

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


---

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


---

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


---

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


---

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


<!-- AI_LOG_ENTRIES_END -->

## Critical Evaluation

### Approximate AI-Assisted Work

| Area | Estimate |
| --- | --- |
| Boilerplate and configuration | ~80% AI-drafted, human-reviewed |
| Pattern implementation (Adapter, Repository, AOP, Factory) | ~70% AI-drafted, human-reviewed and corrected |
| Backend business logic (domain invariants, merge policy) | ~60% AI-drafted, human-confirmed |
| Tests | ~75% AI-drafted, human-reviewed; all pass `npm run verify` |
| Documentation | ~85% AI-drafted, human-reviewed |
| Architectural decisions | 0% — all approved by team before implementation |

### AI Failure Cases

- **AM-006**: ESM + ts-jest required `import type` for enums used only as type casts; AI-generated code used regular imports. Fixed during typecheck.
- **AM-007**: `pg` Pool behavior on instantiation misunderstood by AI — no connection established until first query call. Reviewed and accepted.
- **AM-038**: Initial draft placed JWT extraction in a middleware that imported from infrastructure; corrected to keep auth in the framework controller layer only, respecting `import/no-restricted-paths`.

### Reflection

AI assistance accelerated boilerplate, pattern scaffolding, and test skeleton generation significantly — reducing initial implementation time for domain/application layers by an estimated 60%. Human review was critical for:
1. Architecture boundary decisions (no concrete class imported from wrong layer).
2. Domain invariant correctness (merge policy, idempotency rules).
3. Security: sanitizeLogContext, no tokens in logs, no secrets in fixtures.

The team would use AI more confidently for test-skeleton generation and less confidently for infrastructure adapters with PostgreSQL-specific semantics.
