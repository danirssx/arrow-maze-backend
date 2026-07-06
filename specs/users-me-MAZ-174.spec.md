# Spec — Expose GET /users/me (current authenticated user) (Backend)

Date: 2026-06-28
Ticket: `MAZ-174`
Source: M9 audit (`arrow-maze-m9-auth-leaderboard-fixes`) — auth defect #2; original scope `MAZ-78` (AM-007) listed `GET /users/me` but it was never delivered.
Status: approved pending human gate. The `@s` scenarios in `specs/users-me-MAZ-174.feature` are the executable contract for this slice.

## Purpose

Add a read-only endpoint that returns the authenticated user's own profile (`userId`, `email`, `username`, `role`) derived strictly from the Bearer access token. This lets the mandatory-login mobile bootstrap (MAZ-179) validate a persisted token and re-hydrate the user on relaunch, instead of trusting a possibly-expired token blindly. `PrismaUserRepository.findById` already exists and is currently wired to nothing; this slice gives it an HTTP surface.

## In scope / Out of scope

- In scope: `GetCurrentUserUseCase` (application), `UserController` + `createUserRouter` mounting `GET /users/me` behind the existing auth middleware, app wiring, Swagger/OpenAPI path + schema, application + API tests.
- Out of scope: refresh tokens / logout (MAZ-175), profile editing, password change, role/admin authorization (MAZ-177), any change to register/login.

## Behavior

- `GET /users/me` requires `Authorization: Bearer <jwt>`. The `userId` is taken **only** from the verified token payload (never from query/body).
- On success it returns `200 { status: "success", data: { userId, email, username, role } }`. The password hash is never serialized.
- The use case loads the user via `UserRepository.findById`. If no user matches the token's `userId`, it throws `NotFoundError` (HTTP 404). If the token's `userId` is not a valid UUID, it throws `UnauthorizedError` (HTTP 401) and never queries the repository.

## HTTP contract

- Method/path: `GET /users/me`. Auth: required (`bearerAuth`).
- Inputs: none (identity from token).
- 200 success body: `{ status: "success", data: { userId: uuid, email, username, role: "USER" | "ADMIN" } }`.
- 401: missing/invalid/expired token (`{ status: "error", error: { code: "UNAUTHORIZED" } }`) — produced by the auth middleware.
- 404: valid token, user not found (`{ status: "error", error: { code: "NOT_FOUND" } }`).

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`) — domain untouched
- [x] Application solo orquesta (no business rules, no infra/framework imports) — use case depends only on the `UserRepository` port
- [x] Repositorios: interfaz adentro (port), implementación afuera — reuses the existing `UserRepository.findById`
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities) — output is `{ userId, email, username, role }` strings only
- [x] Invariantes en VO/agregados — none added; `UserId.create` (domain VO) validates the id
- [x] Errores de dominio sin semántica HTTP — use case throws `ApplicationError` subclasses; HTTP mapping stays in `framework`

Layer impact:

- Domain: none.
- Application: new `src/application/identity/use-cases/GetCurrentUserUseCase.ts` (`GetCurrentUserInput`/`GetCurrentUserOutput`).
- Infrastructure: none (reuses `PrismaUserRepository.findById`).
- Framework: new `src/framework/identity/UserController.ts` + `src/framework/identity/userRoutes.ts`; wiring in `src/framework/app.ts`; new path + `CurrentUserResponse` schema in `src/framework/swagger/openApiSpec.ts`.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing application/infrastructure/framework
- [ ] `src/application` importing infrastructure/framework
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Application: `GetCurrentUserUseCase` — returns DTO for existing user (`@s6`), throws `NotFoundError` for missing user (`@s7`), throws `UnauthorizedError` for malformed userId without querying the repo (`@s8`), output has no `passwordHash` key (`@s2`/`@s6`).
- Adapter/API: `GET /users/me` — 200 with profile (`@s1`), no `passwordHash` (`@s2`), 401 no token (`@s3`), 401 bad token (`@s4`), 404 user not found (`@s5`).

## Edge cases

- Missing token → 401 (middleware). Invalid/expired token → 401 (middleware). Valid token, deleted user → 404. Malformed `userId` in payload → 401 (defensive, use case).

## Acceptance criteria (Given/When/Then)

See `specs/users-me-MAZ-174.feature` `@s1`..`@s8`.

## Decisions

- **New `UserController`/`userRoutes` instead of extending `IdentityController`.** Reason: keeps the change additive — it does not alter the `IdentityController` constructor, `createTestApp`, or the passing register/login tests. `/users/me` is a `users` resource distinct from `/auth/*`. Discarded: adding a third use case to `IdentityController` (larger blast radius on existing helpers/tests). Files stay under the existing `src/framework/identity/` folder (no new top-level folder).
- **`user not found` → 404 NotFound** (not 401). Reason: the token is genuinely valid; the resource simply doesn't exist, which is the standard semantics used elsewhere via `NotFoundError`. Discarded: 401 (would force the client to re-login on a deleted account, but conflates auth failure with a missing resource). OPEN QUESTION below if the team prefers 401 for the mandatory-login UX.
- **Malformed token `userId` → 401 Unauthorized** (not 422). Reason: a token whose subject id is not a UUID is an authentication problem, and keeps the endpoint's status surface tight (200/401/404). Discarded: letting `UserId.create` raise `InvalidArgumentError` → 422.
- **No DB lookup change.** Reuses `UserRepository.findById`; no new port methods.

## Risks / OPEN QUESTIONS

- OPEN: Should `GET /users/me` return **401** (instead of 404) when the token is valid but the user no longer exists, so the client's planned 401→logout (MAZ-180) auto-triggers? Default here is 404; flip if the team prefers the auto-logout UX.
- The endpoint exposes `email` to the token owner only (self). Confirm `email` is acceptable in the profile DTO (used for account display); it is the user's own data.
