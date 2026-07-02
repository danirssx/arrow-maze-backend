# Spec — requireAdmin route-level authorization middleware (Backend)

Date: 2026-07-02
Ticket: `MAZ-195` (plan id `BE-01`)
Source: `../Vertiente1-AdminDashboard-Tickets.md` (M11 — Admin Dashboard)
Status: Backlog. The `@s` scenarios in
`specs/admin-authorization-middleware-MAZ-195.feature` are the executable contract.

## Purpose

Add a coarse, transport-level authorization guard `requireAdmin` for the upcoming
`/admin/*` routes (BE-02 users/levels admin reads, etc.). It runs after
`authMiddleware` and only lets requests from an authenticated **ADMIN** through;
everyone else is rejected with 403, and an unauthenticated request is rejected with
401.

## In scope / Out of scope

- In scope: a reusable `requireAdmin` Express middleware + tests.
- Out of scope: creating the `/admin/*` routes themselves (BE-02/BE-03) and any change
  to the per-use-case authorization of level mutations (`assertAdminActor`, MAZ-177).

## Behavior

`requireAdmin` reads the authenticated user placed on the request by `authMiddleware`
(`req.user = { userId, role }`). If there is no authenticated user (defensive: mounted
without `authMiddleware`) it forwards an `UnauthorizedError` (401). If the user's role
is not `ADMIN` it forwards a `ForbiddenError` (403). Otherwise it calls `next()`.

## HTTP contract

- Applied as `router.get('/admin/...', authMiddleware, requireAdmin, handler)`.
- No token / invalid token → 401 (`UNAUTHORIZED`) via `authMiddleware`.
- Authenticated non-ADMIN → 403 (`FORBIDDEN`).
- Authenticated ADMIN → request proceeds to the handler (e.g. 200).

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (unchanged; no new application code)
- [x] DTOs simples en fronteras (n/a — no DTO added)
- [x] Errores de dominio sin semántica HTTP (HTTP mapping stays in `framework` error middleware)

Layer impact (concrete files/changes per layer, or `no previsto`):

- Domain: no previsto (only reads the existing `UserRole` enum value; no change).
- Application: no previsto. Fine-grained per-action authorization (`assertAdminActor`)
  is untouched.
- Infrastructure: no previsto.
- Framework: **new** `src/framework/middleware/requireAdmin.ts` — an Express
  `RequestHandler` that gates `/admin/*` by role, reusing the existing
  `UnauthorizedError`/`ForbiddenError`. Reuses `AuthenticatedRequest` from
  `authMiddleware`.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Persistence/Prisma client used outside `src/infrastructure`
- [ ] DTOs exposing domain entities, `Date`, or runtime objects

Required tests:

- Adapter/API: integration tests (supertest) for no-token→401, USER→403, ADMIN→pass;
  a focused unit test for the defensive no-authenticated-user→401 path.

Architecture acceptance criteria:

- Given the touched layer is `framework`, When imports are inspected, Then it depends
  only inward (`domain` enum + `shared/errors`), never on `application` concretes.
- Given this is transport authorization, When the guard is inspected, Then it holds no
  business rule beyond the role gate; per-action authorization remains in the
  application (`assertAdminActor`, unchanged).

## Edge cases

- Missing `Authorization` header → 401 (authMiddleware).
- Invalid/expired token → 401 (authMiddleware).
- Authenticated `USER` → 403.
- `requireAdmin` mounted without `authMiddleware` (no `req.user`) → 401 (defensive).

## Acceptance criteria (Given/When/Then)

- S1: Given no Bearer token, When a request hits an `/admin/*` route, Then it responds 401.
- S2: Given an authenticated `USER`, When the request hits an `/admin/*` route, Then it
  responds 403 with code `FORBIDDEN`.
- S3: Given an authenticated `ADMIN`, When the request hits an `/admin/*` route, Then the
  guard calls `next()` and the handler runs (200).
- S4: Given `requireAdmin` receives a request with no authenticated user, When it runs,
  Then it forwards an `UnauthorizedError` (401).

## Decisions

- **Coarse route gate in `framework`, not `application`.** The `/admin/*` gate is a
  transport-level authorization concern, analogous to `authMiddleware` (which also makes
  an authz-adjacent decision at the transport boundary). Fine-grained, per-resource
  authorization stays in the application use cases (`assertAdminActor`, MAZ-177).
  *Alternative discarded:* reuse the level-catalog `assertAdminActor` from the middleware
  — rejected to avoid coupling a generic middleware to a level-catalog application file.
- **Reuse `UserRole` enum** instead of a magic `'ADMIN'` string; framework may depend on
  domain (inward).

## Risks / OPEN QUESTIONS

- None. The middleware is wired into real routes by BE-02/BE-03.
