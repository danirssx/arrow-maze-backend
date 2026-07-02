# Spec — GET /admin/levels: list all levels with status (Backend)

Date: 2026-07-02
Ticket: `MAZ-196` (plan id `BE-02`)
Source: `../Vertiente1-AdminDashboard-Tickets.md` (M11 — Admin Dashboard)
Status: Backlog. The `@s` scenarios in `specs/admin-list-levels-MAZ-196.feature` are the
executable contract. Depends on `MAZ-195` (requireAdmin middleware) — stacked branch.

## Purpose

Add an ADMIN-only `GET /admin/levels` endpoint that lists **every** level (DRAFT,
PUBLISHED, ARCHIVED) with its `status`, optionally filtered by `?status=`. The admin
dashboard needs to see drafts/archived levels, which the public `GET /levels` (published
only) never returns.

## In scope / Out of scope

- In scope: `ListAdminLevelsUseCase`, the `LevelRepository.findAll(status?)` port method
  + Prisma impl, the `AdminLevelController` + guarded route, and wiring.
- Out of scope: the public `GET /levels` (unchanged — published only), OpenAPI docs for
  `/admin/*` (BE-05), and any level mutation.

## Behavior

`GET /admin/levels` runs `authMiddleware` + `requireAdmin`. It returns all levels as
summaries including `status`, ordered by `createdAt asc`. A `?status=DRAFT|PUBLISHED|
ARCHIVED` query filters by that status; an unknown `status` value is a 400.

## HTTP contract

- `GET /admin/levels` (auth + ADMIN).
- 200 `{ status: "success", data: { levels: AdminLevelSummary[] } }` where each item is
  `{ levelId, name, difficulty, status, arrowCount, attempts, timeLimitSeconds?, createdAt }`.
- `?status=DRAFT` → only DRAFT levels. Unknown status → 400 (`BAD_REQUEST`).
- Non-ADMIN → 403; no/invalid token → 401.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no change to domain)
- [x] Application solo orquesta (use case maps aggregates → DTO; no business rules)
- [x] Repositorios: interfaz adentro (port), implementación afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives; `createdAt: Date` mirrors the existing
      `LevelSummaryDto` of `GetLevelsUseCase` for module consistency)
- [x] Errores de dominio sin semántica HTTP (HTTP mapping stays in framework)

Layer impact:

- Domain: no previsto (reads existing `Level` getters + `LevelStatus` enum).
- Application: **new** `ListAdminLevelsUseCase` (query, no authorization — the route
  guards it); **new** `LevelRepository.findAll(status?: LevelStatus)` port method.
- Infrastructure: `PrismaLevelRepository.findAll` (findMany, optional status filter,
  `createdAt asc`); `FakeLevelRepository` (test helper) gains `findAll`.
- Framework: **new** `AdminLevelController.listLevels` (parses/validates `?status`) +
  **new** `createAdminLevelRouter` (`authMiddleware` + `requireAdmin`); `app.ts` wiring.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing outward layers
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Prisma client used outside `src/infrastructure`
- [ ] Business rules in the controller/middleware (only transport parsing + the coarse
      ADMIN gate, which is `requireAdmin` from MAZ-195)

Required tests:

- Application: `ListAdminLevelsUseCase` returns all levels with status; filters by status.
- Adapter/API: 200 for ADMIN with status field; `?status` passed through; invalid status
  → 400; USER → 403; no token → 401.

Architecture acceptance criteria:

- Given the use case, When inspected, Then it depends only on the `LevelRepository` port
  and domain, never on infrastructure/framework.
- Given the controller, When inspected, Then it only parses transport input and delegates
  authorization to `requireAdmin`; no business rule lives there.

## Edge cases

- No levels → `{ levels: [] }`.
- `?status=` empty or unknown → 400.
- Mixed statuses present → all returned when no filter.

## Acceptance criteria (Given/When/Then)

- S1: Given levels of every status, When an ADMIN GETs `/admin/levels`, Then it responds
  200 with all of them, each carrying its `status`.
- S2: Given `?status=DRAFT`, When an ADMIN GETs `/admin/levels?status=DRAFT`, Then only
  DRAFT levels are returned.
- S3: Given an authenticated USER, When it GETs `/admin/levels`, Then 403.
- S4: Given no token, When GETting `/admin/levels`, Then 401.
- S5: Given `?status=NONSENSE`, When an ADMIN GETs it, Then 400 (`BAD_REQUEST`).

## Decisions

- **Separate `AdminLevelController` + router** instead of extending `LevelCatalogController`
  — avoids changing that controller's constructor (used across many tests) and keeps the
  admin read cohesive. *Alternative discarded:* add a 7th use case to
  `LevelCatalogController` (large positional-constructor ripple).
- **No authorization inside the read use case**; the coarse ADMIN gate is `requireAdmin`
  (MAZ-195) at the route, consistent with the public read use cases having no authz.
- **Status validation in the controller** (transport boundary) → 400 on unknown; the use
  case receives a typed `LevelStatus | undefined`.

## Risks / OPEN QUESTIONS

- None. Stacked on MAZ-195; merge #69 (BE-01) first. OpenAPI docs land in BE-05.
