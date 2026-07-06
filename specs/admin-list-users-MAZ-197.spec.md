# Spec — GET /admin/users: read-only paginated user list (Backend)

Date: 2026-07-02
Ticket: `MAZ-197` (plan id `BE-03`)
Source: `../Vertiente1-AdminDashboard-Tickets.md` (M11 — Admin Dashboard)
Status: Backlog. The `@s` scenarios in `specs/admin-list-users-MAZ-197.feature` are the
executable contract. Depends on `MAZ-195` (requireAdmin) — stacked branch.

## Purpose

Add an ADMIN-only, read-only, paginated `GET /admin/users` so the admin dashboard can
view platform users. The response exposes `userId, email, username, role, status,
createdAt` and **never** `passwordHash`. No mutations.

## In scope / Out of scope

- In scope: a narrow `AdminUserRepository.findAll(offset, limit)` port + Prisma impl, the
  `ListUsersUseCase`, the `AdminUserController` + guarded route, wiring.
- Out of scope: any user mutation (suspend/edit), OpenAPI docs for `/admin/*` (BE-05).

## Behavior

`GET /admin/users` runs `authMiddleware` + `requireAdmin`. It returns a page of users
ordered by `createdAt asc`, plus `{ page, limit, total }`. `?page` and `?limit` control
pagination (defaults page=1, limit=20; limit capped at 100); a non-positive-integer
`page`/`limit` is a 400.

## HTTP contract

- `GET /admin/users?page&limit` (auth + ADMIN).
- 200 `{ status: "success", data: { users: AdminUserDto[], page, limit, total } }`,
  `AdminUserDto = { userId, email, username, role, status, createdAt }` (no `passwordHash`).
- Non-ADMIN → 403; no/invalid token → 401; invalid `page`/`limit` → 400 (`BAD_REQUEST`).

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no change to domain)
- [x] Application solo orquesta (use case maps aggregates → DTO; page→offset math only)
- [x] Repositorios: interfaz adentro (narrow port), implementación afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives; `createdAt: Date` mirrors existing DTOs)
- [x] Interface Segregation: a narrow `AdminUserRepository` (read listing) separate from
      the write-heavy `UserRepository`, so unrelated use cases/fakes are untouched.

Layer impact:

- Domain: no previsto (reads existing `User` getters; never `passwordHash`).
- Application: **new** `AdminUserRepository` port (`findAll(offset, limit)`) + **new**
  `ListUsersUseCase` (query; page→offset; maps to DTO without `passwordHash`).
- Infrastructure: `PrismaUserRepository` also `implements AdminUserRepository` with
  `findAll` (findMany skip/take + count, `createdAt asc`).
- Framework: **new** `AdminUserController.listUsers` (parses/validates `page`/`limit`) +
  **new** `createAdminUserRouter` (`authMiddleware` + `requireAdmin`); `app.ts` wiring.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing outward layers
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Prisma client used outside `src/infrastructure`
- [ ] Exposing `passwordHash` in any DTO/response
- [ ] Any mutation on `/admin/users`

Required tests:

- Application: `ListUsersUseCase` returns users without `passwordHash`; converts page→
  offset; returns pagination metadata.
- Adapter/API: 200 for ADMIN (no `passwordHash`); page/limit applied + defaults; invalid
  page/limit → 400; USER → 403; no token → 401.

Architecture acceptance criteria:

- Given the use case, When inspected, Then it depends only on the `AdminUserRepository`
  port + domain, never on infrastructure/framework.
- Given any response body, When inspected, Then it never contains `passwordHash`.

## Edge cases

- No users → `{ users: [], total: 0 }`.
- `?page=0` / `?limit=abc` / negative → 400.
- `?limit=99999` → clamped to 100.
- Page beyond the last → empty `users` with the real `total`.

## Acceptance criteria (Given/When/Then)

- S1: Given users exist, When an ADMIN GETs `/admin/users`, Then 200 with the users and
  pagination metadata, none exposing `passwordHash`.
- S2: Given `?page=2&limit=5`, When an ADMIN GETs it, Then the repository is queried with
  `offset=5, limit=5` and the response echoes `page=2, limit=5`.
- S3: Given no query, When an ADMIN GETs it, Then defaults (page=1, limit=20) apply.
- S4: Given `?page=0`, When an ADMIN GETs it, Then 400 (`BAD_REQUEST`).
- S5: Given an authenticated USER, When it GETs `/admin/users`, Then 403.
- S6: Given no token, When GETting `/admin/users`, Then 401.

## Decisions

- **Narrow `AdminUserRepository` port (ISP)** instead of adding `findAll` to
  `UserRepository` — avoids breaking the many inline `UserRepository` fakes and keeps the
  read listing segregated. *Alternative discarded:* widen `UserRepository` (ripple across
  5+ test fakes).
- **Port speaks `offset`/`limit`** (pagination-neutral); the use case maps `page→offset`.
- **No authorization in the use case**; the coarse ADMIN gate is `requireAdmin` (MAZ-195).

## Risks / OPEN QUESTIONS

- None. Stacked on MAZ-195; merge #69 (BE-01) first. OpenAPI docs land in BE-05.
