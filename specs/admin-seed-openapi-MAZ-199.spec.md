# Spec - Admin seed user and `/admin/*` OpenAPI docs (Backend)

Date: 2026-07-02
Ticket: `MAZ-199` (plan id `BE-05`)
Source: `../Vertiente1-AdminDashboard-Tickets.md` (M11 - Admin Dashboard) and Linear `MAZ-199`
Status: Approved by human on 2026-07-02. The `@s` scenarios in
`specs/admin-seed-openapi-MAZ-199.feature` are the executable contract for this slice.

## Purpose

Make the admin dashboard immediately usable in local/dev databases by seeding one documented,
non-secret ADMIN account, and document the new admin read endpoints in OpenAPI and README.

## In scope / Out of scope

- In scope: add one admin credential to the existing demo seed credential source, ensure
  `prisma/seed.ts` persists its role as `ADMIN`, prove the documented password is bcrypt cost 12
  compatible, document the credential in README, and add OpenAPI paths/schemas for
  `GET /admin/levels` and `GET /admin/users` with `bearerAuth`.
- Out of scope: creating the admin web frontend, changing `/admin/levels` or `/admin/users`
  behavior, adding new admin mutations, changing password hashing policy, or adding production
  secrets.

## Behavior

`npm run db:seed` creates the existing demo users plus one local/dev admin account:
`admin@arrowmaze.test` / `admin_arrow` / `ArrowDemo!Admin`. The password is intentionally
documented and non-secret, is valid according to `RawPassword`, and is hashed by the seed with
the existing `DEMO_PASSWORD_BCRYPT_COST = 12`.

Because the seeded row has `role = ADMIN`, the existing `POST /auth/login` response returns
`role: "ADMIN"` for that account. The account is only for local/dev databases and must not be
reused in production.

OpenAPI documents the already implemented admin read endpoints:

- `GET /admin/levels`, guarded by `bearerAuth`, returns all levels with `status` and optional
  `?status=DRAFT|PUBLISHED|ARCHIVED`.
- `GET /admin/users`, guarded by `bearerAuth`, returns paginated users and never exposes
  `passwordHash`.

## HTTP contract

- `POST /auth/login` with `{ "email": "admin@arrowmaze.test", "rawPassword": "ArrowDemo!Admin" }`
  returns the existing login response shape with `data.role = "ADMIN"`.
- `GET /admin/levels` in OpenAPI has `security: [{ bearerAuth: [] }]`, optional `status` query,
  and 200/400/401/403 responses.
- `GET /admin/users` in OpenAPI has `security: [{ bearerAuth: [] }]`, optional `page`/`limit`
  queries, and 200/400/401/403 responses.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no change to domain)
- [x] Application solo orquesta (no change to application use cases)
- [x] Repositorios: interfaz adentro (n/a - no repository contract change)
- [x] DTOs simples en fronteras (OpenAPI schemas are primitive records only)
- [x] Invariantes en VO/agregados (password validity checked through existing `RawPassword`)
- [x] Errores de dominio sin semántica HTTP (unchanged)

Layer impact:

- Domain: no previsto; reuse existing `RawPassword` validation in tests only.
- Application: no previsto; existing `LoginUseCase` already returns the user role.
- Infrastructure: update Prisma seed data/seed script so each seeded credential carries its role.
- Framework: update `src/framework/swagger/openApiSpec.ts` to document `/admin/levels` and
  `/admin/users`.
- Docs: update `README.md` local/dev credential table and endpoint list.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`,
  `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`
- [ ] Committing real secrets or production admin credentials

Required tests:

- Seed: admin credential exists, is role `ADMIN`, has unique id/email/username, password is a valid
  `RawPassword`, and a cost-12 bcrypt hash verifies with `BcryptPasswordHasher`.
- Seed/login contract: the seeded admin credential can produce the existing login response with
  `role: "ADMIN"` using the existing login/auth chain or an equivalent use-case-level test.
- Framework/OpenAPI: `/admin/levels` and `/admin/users` are present, use `bearerAuth`, and expose
  only the documented query/response fields.
- Docs: README includes the admin credential and admin endpoint list.

Architecture acceptance criteria:

- Given seed changes are infrastructure/dev-data concerns, When imports are inspected, Then domain
  and application production code remain untouched.
- Given OpenAPI is framework documentation, When `/admin/*` docs are added, Then no controller
  behavior or authorization logic changes.
- Given the admin credential is local/dev only, When docs are inspected, Then it is explicitly
  labeled non-secret and not for production reuse.

## Edge cases

- Admin credential id/email/username must not collide with existing demo users.
- Admin password must satisfy `RawPassword`.
- Admin row must seed as `ACTIVE`.
- README must not imply the credential is safe for production.
- OpenAPI must not document `passwordHash` anywhere in `/admin/users`.

## Acceptance criteria (Given/When/Then)

- S1: Given the demo seed credentials, When they are inspected, Then one credential is
  `admin@arrowmaze.test` with username `admin_arrow`, role `ADMIN`, status `ACTIVE`, unique
  id/email/username, and a valid documented password.
- S2: Given the seed hashes the admin credential, When the documented admin password is verified
  with the app hasher, Then the bcrypt cost is 12 and verification succeeds.
- S3: Given the seeded admin credential, When the existing login contract is exercised, Then the
  login response contains `role: "ADMIN"`.
- S4: Given the OpenAPI spec, When `/admin/levels` is inspected, Then it is documented with
  `bearerAuth`, optional `status` query, and an admin levels response including `status`.
- S5: Given the OpenAPI spec, When `/admin/users` is inspected, Then it is documented with
  `bearerAuth`, optional pagination query params, user list metadata, and no `passwordHash`.
- S6: Given README local setup docs, When the demo credentials and API endpoint list are inspected,
  Then the admin credential and `/admin/levels` + `/admin/users` endpoints are documented as
  local/dev admin access.

## Decisions

- **Add `role` to each demo credential** instead of maintaining a separate admin-id list in
  `seed.ts`. This keeps `demoCredentials.ts` the single source of truth for seeded users.
  *Alternative discarded:* hard-code admin selection in `seed.ts`, which would split user identity
  and role across files.
- **Use one documented non-secret admin password** following the MAZ-178 pattern. This gives local
  developers and the admin frontend an immediate login path without introducing secrets.
  *Alternative discarded:* generating a random admin password during seed, which would be
  impossible to document and would not satisfy the ticket.
- **Document only existing admin reads** in OpenAPI. Admin mutations on `/levels/*` already exist
  under the level catalog paths; this ticket only adds the `/admin/*` endpoints created by
  MAZ-196/197.

## Risks / OPEN QUESTIONS

- None. Production deployments must provision real admin users outside these local/dev demo
  credentials.
