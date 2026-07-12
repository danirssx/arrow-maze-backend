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
CORS_ORIGIN=http://localhost:8081,http://localhost:5173
# Optional auth token lifetimes:
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=30

# Optional backend-only daily challenge generation:
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
```

`CORS_ORIGIN` accepts a comma-separated list of exact browser origins. Keep the
Expo development origin (`http://localhost:8081`) and add the admin web origin
(`http://localhost:5173` locally, or the deployed admin URL in production).
Origins not listed do not receive `Access-Control-Allow-Origin`.

Auth issues a short-lived **access token** plus a long-lived, rotating, revocable
**refresh token** stored only as a hash. `POST /auth/refresh` exchanges a refresh
token for a new access token and rotates the refresh token. `POST /auth/logout`
revokes a refresh token.

`GEMINI_API_KEY` is optional and must stay server-side in this backend only. If
it is omitted, `GET /daily-challenge` still returns a deterministic validated
fallback challenge for the current UTC date. Mobile and admin clients consume the
backend endpoint and never call Gemini directly.

Admins can manually re-generate the daily challenge for a UTC date through
`POST /admin/daily-challenge/iterations` (guarded by `authMiddleware` +
`requireAdmin`). The command returns a `202` with a `RUNNING` operation; the
admin dashboard polls `GET /admin/daily-challenge/iterations/:operationId` for the
ordered, sanitized operation log until the operation reaches `SUCCEEDED` or
`FAILED`. The previously cached challenge stays live until a new candidate fully
validates, and operation events never expose Gemini keys, prompts, raw provider
payloads, or stack traces.

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

`npm run db:seed` creates local/dev demo users so the mandatory-login, QA, and admin
dashboard flows can be exercised on a seeded database. Their passwords are
**documented, non-secret local/dev values** (defined in
`prisma/seed-data/demoCredentials.ts`) hashed with bcrypt cost 12. **Never reuse them in production.**

| Email | Username | Role | Password | Purpose |
| --- | --- | --- | --- | --- |
| `demo@arrowmaze.test` | `demo_player` | `USER` | `ArrowDemo!Player` | Demo player (has seeded progress + leaderboard entries) |
| `mika@arrowmaze.test` | `mika_arrows` | `USER` | `ArrowDemo!Mika` | Demo leaderboard rival |
| `noah@arrowmaze.test` | `noah_escape` | `USER` | `ArrowDemo!Noah` | Demo leaderboard rival |
| `admin@arrowmaze.test` | `admin_arrow` | `ADMIN` | `ArrowDemo!Admin` | Local/dev admin dashboard account |
| `qa@arrowmaze.test` | `qa_catalog` | `USER` | `ArrowDemo!QaCatalog` | QA full-catalog account - starts empty, normal progression |

Log in via `POST /auth/login` with `{ "email": "demo@arrowmaze.test", "rawPassword":
"ArrowDemo!Player" }`, then call authenticated endpoints (e.g. `GET /users/me`,
`GET /progress/me`) with the returned `accessToken` as `Authorization: Bearer …`.
The end-to-end `register → login → authenticated request` chain is verified by
`tests/integration/authFlow.e2e.test.ts`.

#### Full-catalog QA runbook (local / dev only)

The `qa_catalog` account is the single stable user QA uses to exercise the complete
level catalog, progress, leaderboard submit, refresh-token, and sync flows without
creating many accounts. **Chosen policy (MAZ-194): normal progression** - the account is
seeded empty and unlocks levels by completing them in order, exactly like any normal
`USER`. This avoids adding any local/dev lock bypass that could weaken normal
progression. It is a documented non-secret local/dev account only; do not deploy it as
production credential material.

1. `npm run db:setup` (fresh DB: migrate + seed) - creates `qa_catalog` and publishes
   the full catalog.
2. `POST /auth/login` with `{ "email": "qa@arrowmaze.test", "rawPassword": "ArrowDemo!QaCatalog" }`.
3. `GET /levels` to list the whole catalog; on the client, only level 1 is unlocked at
   first (sequential locking, MAZ-191).
4. Play/complete each level in order; each completion
   (`POST /progress/levels/:levelId/complete`) records progress and unlocks the next
   level, letting the same account reach every catalog level. Score submit and
   refresh-token flows can be exercised along the way.

Seed validity and the empty-start policy are covered by
`tests/seed/demoCredentials.test.ts` and `tests/seed/demoProgress.test.ts`.

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
GET  /daily-challenge
POST /admin/daily-challenge/iterations
GET  /admin/daily-challenge/iterations/:operationId
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /users/me
GET  /admin/levels
GET  /admin/users
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
