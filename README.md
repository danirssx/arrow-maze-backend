# Arrow Maze Backend

REST API for Arrow Maze, built with Node.js, Express, and TypeScript.

## Tech Stack

- Node.js
- Express
- TypeScript
- Swagger / OpenAPI
- Jest
- Supertest
- Docker
- ESLint
- Husky
- Commitlint

## Architecture Overview

The backend follows Clean Architecture.

```txt
framework -> infrastructure -> application -> domain
```

Business rules belong in `src/domain`. Use cases and ports belong in `src/application`. Database, JWT, hashing, and logging implementations belong in `src/infrastructure`. Express, routes, controllers, middleware, Swagger, and server bootstrap belong in `src/framework`.

## Academic Compliance

This repository must stay aligned with Section 6 and Section 7 of the project statement.

Section 6 requires a clear, professional, and updated `README.md` covering project description, architecture, design patterns, SOLID principles, AOP strategy, local execution, tests, contribution workflow, diagrams, and AI usage documentation.

Section 7 requires every significant AI-assisted intervention to be documented in `AI_USAGE.md` and/or `ai-log/`, including the tool, prompt, generated result, team modifications, and lessons learned. AI-assisted code must be reviewed, tested, and understood by the team before integration.

## Folder Structure

```txt
src/domain/
src/application/
src/infrastructure/
src/framework/
src/shared/
tests/
docs/
ai-log/
```

## Design Patterns

| Pattern | Layer | Key class(es) |
| --- | --- | --- |
| Repository | infrastructure | `PgUserRepository`, `PgLeaderboardRepository`, `PgProgressRepository` |
| Adapter | infrastructure | All `Pg*` repos, `BcryptPasswordHasher`, `JwtTokenService` |
| Factory | domain | `UserFactory` |
| Unit of Work | infrastructure | `PgUnitOfWork` |
| AOP Decorator | application | `UseCaseLoggingDecorator`, `TransactionDecorator` |
| Template Method | application | `UseCase<Input,Output>` contract |
| Aggregate Root | domain | `User`, `Leaderboard`, `PlayerProgress` |
| Value Object | domain | All VOs (UserId, Email, ProgressId, LevelScore, …) |
| Domain Event | domain | `UserRegistered`, `LevelCompletedEvent`, `LeaderboardUpdatedEvent` |
| Merge Policy | domain | `ProgressMergePolicy` |

## SOLID Principles

| Principle | Where |
| --- | --- |
| **S** — Single Responsibility | Each use case does one thing; controllers only delegate to use cases |
| **O** — Open/Closed | `UseCase<I,O>` interface extended by decorators without modifying use cases |
| **L** — Liskov Substitution | All repository implementations are interchangeable behind their port interfaces |
| **I** — Interface Segregation | `IProgressRepository`, `IDomainEventBus`, `IPasswordHasher` are narrow, separate ports |
| **D** — Dependency Inversion | Framework layer injects concrete adapters into application use cases via constructor |

## AOP Strategy

Cross-cutting concerns are handled in the application layer with two decorators:

- `UseCaseLoggingDecorator` — logs start, finish, duration, and sanitized error context without modifying use case code.
- `TransactionDecorator` — wraps any use case in a `PgUnitOfWork` BEGIN/COMMIT/ROLLBACK without the use case knowing about transactions.

`sanitizeLogContext` strips passwords, tokens, secrets, credentials, and authorization fields before any log is written. No PII or credentials are ever logged.

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL 16 (local or Docker)

### Environment variables

Copy `.env.example` to `.env` and fill in your values (never commit `.env`):

```
DATABASE_URL=postgresql://user:pass@localhost:5432/arrow_maze
JWT_SECRET=your-secret-here
PORT=3000
# Optional auth token lifetimes:
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=30
```

Auth issues a short-lived **access token** plus a long-lived, rotating, revocable
**refresh token** stored only as a hash. `POST /auth/refresh` exchanges a refresh
token for a new access token and rotates the refresh token. `POST /auth/logout`
revokes a refresh token.

### Run locally

```bash
npm install
npm run dev       # ts-node watch mode
```

### Database & ORM (Prisma)

All database access goes through [Prisma](https://www.prisma.io/docs). Prisma is an
**infrastructure** concern: the schema lives in `prisma/schema.prisma`, the generated
client and the `@prisma/adapter-pg` driver adapter are used only inside
`src/infrastructure`, and `src/domain`/`src/application` never import the ORM.

The Prisma Client is generated automatically on `npm install` (via the `postinstall`
hook). To regenerate it after editing the schema:

```bash
npm run db:generate
```

Apply migrations and seed before the first run:

```bash
npm run db:migrate   # prisma migrate deploy — applies prisma/migrations
npm run db:seed      # prisma db seed — runs prisma/seed.ts (levels + demo data)
npm run db:setup     # migrate then seed (fresh database)
```

During development, `npm run db:migrate:dev` (`prisma migrate dev`) creates a new
migration from schema changes.

The schema is tracked by **Prisma Migrate as a single `0_init` baseline** in
`prisma/migrations/` (the legacy hand-written `001`–`005` SQL files are gone). A
fresh database only needs `npm run db:setup` (`db:migrate` then `db:seed`).

#### Demo credentials (local / dev only)

`npm run db:seed` creates four demo users so the mandatory-login flow can be
exercised on a seeded database. Their passwords are **documented, non-secret
local/dev values** (defined in `prisma/seed-data/demoCredentials.ts`) hashed with
bcrypt cost 12. **Never reuse them in production.**

| Email | Username | Password |
| --- | --- | --- |
| `admin@arrowmaze.test` | `admin_debug` | `ArrowAdmin!Debug` |
| `demo@arrowmaze.test` | `demo_player` | `ArrowDemo!Player` |
| `mika@arrowmaze.test` | `mika_arrows` | `ArrowDemo!Mika` |
| `noah@arrowmaze.test` | `noah_escape` | `ArrowDemo!Noah` |

Log in via `POST /auth/login` with `{ "email": "demo@arrowmaze.test", "rawPassword":
"ArrowDemo!Player" }`, then call authenticated endpoints (e.g. `GET /users/me`,
`GET /progress/me`) with the returned `accessToken` as `Authorization: Bearer …`.
The end-to-end `register → login → authenticated request` chain is verified by
`tests/integration/authFlow.e2e.test.ts`.

#### Authoring levels (JSON → DB → game)

The published catalog is sourced **entirely** from JSON files in
`prisma/seed-data/level-json/` — one `<order>-<slug>.json` per level. This folder is the
single source of truth (the client reads the catalog through the API).

To add or edit a level: drop/modify a JSON file and run `npm run db:seed`. Each file is
validated through the real domain (ArrowSpec invariants; for shaped boards the
`boardShape` CELL_MASK mask + arrow containment; and `LevelSolvabilityPolicy` DAG
solvability) and the loader enforces a unique `id` and `order`, so a broken or colliding
level fails the seed instead of being published. The level JSON shape:

```jsonc
{
  "id": "<uuid>",
  "name": "My Level",
  "description": "…",
  "difficulty": "EASY | MEDIUM | HARD",
  "order": 16,                  // controls the level number in the catalog
  "attempts": 6,
  "timeLimitSeconds": 110,      // optional → timed level
  "arrows": [{ "id": "a", "color": "blue", "direction": "UP", "path": [{ "row": 0, "col": 0 }] }],
  "boardShape": {               // optional (Option A): abstract masked board
    "type": "CELL_MASK",
    "cells": [{ "row": 0, "col": 0 }]
  }
}
```

`npm run seed:generate` is an **optional** authoring tool (it is NOT part of the seed):
it (re)writes the 15 procedural dense levels as JSON files in that folder; hand-authored
files (e.g. abstract shaped boards) are left untouched. The seed itself is idempotent
(every write is an upsert keyed by `id`).

### Swagger UI

```
GET http://localhost:3000/docs
```

The API exposes:

```
GET  /health
GET  /docs
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /users/me
POST /leaderboard/scores
GET  /leaderboard/:levelId
GET  /progress/me
POST /progress/levels/:levelId/complete
PUT  /progress/sync
```

## Quality Commands

```bash
npm run lint           # ESLint with architecture guardrails
npm run typecheck      # TypeScript strict check, no emit
npm test               # Jest (all suites)
npm run test:coverage  # Jest with coverage report in ./coverage
npm run build          # tsc compile to dist/
npm run verify         # lint + typecheck + test:coverage (run before PR)
```

## Architecture Guardrails

Clean Architecture boundaries are enforced by ESLint through `import/no-restricted-paths`.

Current guarded rules:

- `src/domain` must not import `src/application`, `src/infrastructure`, or `src/framework`.
- `src/application` must not import `src/infrastructure` or `src/framework`.
- `src/infrastructure` must not import `src/framework`.

If a ticket requires changing these boundaries, stop and ask the team before editing code.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

## CI/CD

Pull requests run install, lint, typecheck, tests with coverage, and build through GitHub Actions.

## Contributing

See `CONTRIBUTING.md`.

## AI Usage

Every significant AI-assisted task must create an entry in `ai-log/`. The final summary is maintained in `AI_USAGE.md`.

## License

Academic project. License decision pending team approval.
