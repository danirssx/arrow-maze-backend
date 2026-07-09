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

## Port naming convention

Port interface files in `src/application/*/ports/` follow these rules:

- **No `I` prefix** on the filename or the exported TypeScript type.
- The filename must match the exported type name exactly (one type per file).
- Correct example: `UserRepository.ts` exporting `interface UserRepository { ... }`.
- Wrong example: `IUserRepository.ts` — do not use this pattern.

This convention is enforced by the architecture test
`tests/architecture/portNamingConvention.test.ts`.

## ESLint architectural guardrails

The following rules in `eslint.config.js` turn domain-layer regressions into
CI failures:

| Rule | What it blocks | Why |
|------|---------------|-----|
| `no-restricted-imports` (`crypto`, `node:crypto`) in `src/domain/**` | Importing the Node.js `crypto` module | Domain must use `IdGenerator`/`Clock` ports; runtime adapters belong in infrastructure |
| `no-restricted-imports` (`**/shared/errors/AppError*`) in `src/domain/**` | Importing `AppError` | `AppError` carries `httpStatus` (HTTP semantics); domain errors must extend `DomainError` |
| `import/no-restricted-paths` (layer zones) | Cross-layer imports (e.g. domain → application, application → infrastructure) | Enforces the inward-only dependency rule |

Required diagrams before final delivery:

- `docs/clean-architecture.drawio`
- `docs/clean-architecture.png`
- `docs/class-diagram.drawio`
- `docs/class-diagram.png`
