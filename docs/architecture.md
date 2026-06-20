# Arrow Maze Backend Architecture

This repository follows Clean Architecture.

Dependency direction:

```txt
framework -> infrastructure -> application -> domain
```

Rules:

- `src/domain` contains business rules only.
- `src/application` contains use cases and ports approved by the team.
- `src/infrastructure` implements ports and external adapters.
- `src/framework` contains Express, routes, controllers, middleware, Swagger, environment loading, and dependency wiring.

## Persistence (Prisma ORM)

Database access is implemented with [Prisma](https://www.prisma.io/docs), kept
strictly inside `src/infrastructure`:

- `prisma/schema.prisma` is the single source of truth for the database layout
  (models mapped to the existing tables/columns via `@@map`/`@map`). Schema
  changes are tracked by Prisma Migrate under `prisma/migrations`.
- The generated Prisma Client and `@prisma/adapter-pg` (the `pg` driver adapter)
  are used only by the `Prisma*Repository` adapters and `PrismaClientProvider`.
- `PrismaUnitOfWork` implements the application `UnitOfWork` port using Prisma
  interactive transactions; the active transaction client is shared with the
  repositories through `prismaContext` (an `AsyncLocalStorage`), so a use case
  wrapped by `TransactionDecorator` runs all repository calls atomically.
- `src/domain` and `src/application` never import `@prisma/client`; they depend
  only on the ports (`UserRepository`, `LevelRepository`, `LeaderboardRepository`,
  `ProgressRepository`, `UnitOfWork`).

Required diagrams before final delivery:

- `docs/clean-architecture.drawio`
- `docs/clean-architecture.png`
- `docs/class-diagram.drawio`
- `docs/class-diagram.png`
