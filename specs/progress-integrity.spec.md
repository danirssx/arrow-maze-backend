# Spec — Progress Timestamp And Referential Integrity (Backend)

Date: 2026-06-28
Ticket: `MAZ-176`
Source: Linear issue `MAZ-176`
Status: approved by user request. The `@s` scenarios in
`specs/progress-integrity.feature` are the executable contract for this slice.

## Purpose

Reject malformed progress completion timestamps before persistence and harden the
database so progress and leaderboard rows cannot point at missing users or levels.

## In scope / Out of scope

- In scope: `CompletedAt` validation, progress complete/sync timestamp parsing,
  HTTP 422 for invalid `completedAt`, Prisma schema relations, Prisma migration
  for user/level foreign keys, and tests for the validation and migration SQL.
- Out of scope: client changes, new endpoints, user/level delete workflows,
  historical data cleanup scripts, and leaderboard scoring behavior changes.

## Behavior

- `CompletedAt` accepts only valid `Date` instances.
- A date string that parses to `Invalid Date` is rejected before a progress row is
  saved.
- Future completion times are rejected to prevent impossible completion history.
- Progress completion and sync use the same domain value object invariant.
- The database rejects rows that reference nonexistent users or levels for the
  progress and leaderboard tables in this slice.

## HTTP contract

- `POST /progress/levels/:levelId/complete`
  - Auth: bearer token required.
  - Invalid or future `completedAt`: `422` with the standard error envelope and
    code `INVALID_ARGUMENT`.
  - Missing required field remains `400 BAD_REQUEST`.
  - Valid payload remains `201` with a success envelope.
- `PUT /progress/sync`
  - Auth: bearer token required.
  - Invalid or future `completedAt` inside `completedLevels`: `422` with the
    standard error envelope and code `INVALID_ARGUMENT`.
  - Valid payload remains `200` with a success envelope.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (no business rules, no infra/framework imports)
- [x] Repositorios: interfaz adentro (port), implementación afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [x] Invariantes en VO/agregados (no en controllers/services de aplicación)
- [x] Errores de dominio sin semántica HTTP (mapping HTTP solo en `framework`)

Layer impact:

- Domain: `CompletedAt` enforces valid and non-future timestamps.
- Application: progress use cases continue orchestrating DTO-to-domain mapping
  and construct `CompletedAt` through the domain invariant.
- Infrastructure: Prisma schema and migration add relations and FKs; repositories
  keep using Prisma only in `src/infrastructure`.
- Framework: existing error middleware maps domain validation to HTTP 422; the
  controller keeps required-field checks only.

Forbidden moves:

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: `CompletedAt` rejects invalid and future dates.
- Application/API: complete/sync progress reject invalid timestamps before saving.
- Adapter/API: migration smoke test asserts the new user/level FK constraints.

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then
  dependencies point inward only.
- Given boundaries are crossed, When DTOs are inspected, Then they are simple
  records/primitives.
- Given business invariants are involved, When implementation is inspected, Then
  they live in VO/agregados/domain services, not controllers/middleware.

## Edge cases

- `completedAt` is an unparsable string.
- `completedAt` is a future date.
- `completedAt` is missing.
- A progress row references a missing user.
- A completed level or leaderboard references a missing level.
- A leaderboard entry references a missing user.

## Acceptance criteria (Given/When/Then)

- S1: Given a complete-level request with an invalid `completedAt`, When the API
  handles it, Then the response is 422 and no completion is saved.
- S2: Given a progress sync payload with an invalid completed level timestamp,
  When the use case maps it, Then the timestamp is rejected before persistence.
- S3: Given the Prisma migration, When it is inspected or applied, Then user and
  level foreign keys exist for progress and leaderboard integrity.

## Decisions

- Use `CompletedAt` as the invariant owner because timestamp validity is a
  domain concept shared by complete and sync flows. The discarded alternative was
  duplicating parsing checks in controllers, which would leave non-HTTP use cases
  unprotected.
- Reject future timestamps in `CompletedAt` because client-provided completion
  history should not create impossible progress. The discarded alternative was
  only rejecting `Invalid Date`, which still allows corrupt future history.
- Use `ON DELETE RESTRICT` for new user/level FKs to reject accidental orphaning
  instead of silently deleting score/progress history. Explicit cleanup can be a
  separate use case if the team wants account or level deletion semantics later.

## Risks / OPEN QUESTIONS

- Existing local databases with pre-UUID `level_id` strings or orphan rows must
  clean those rows before this migration can apply.
