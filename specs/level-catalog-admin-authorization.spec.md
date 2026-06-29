# Spec - Level Catalog Admin Authorization (Backend)

Date: 2026-06-29
Ticket: `MAZ-177`
Source: Linear issue `MAZ-177` and audit defect #4
Status: Backlog / pending executable contract approval. The `@s` scenarios in
`specs/level-catalog-admin-authorization.feature` are the executable contract
for this slice.

## Purpose

Enforce ADMIN authorization for authenticated level-catalog mutation requests at
the application boundary so regular players cannot create, update, publish, or
archive levels once mandatory login gives every player a valid token.

## In scope / Out of scope

- In scope: require an ADMIN actor for `POST /levels`, `PUT /levels/:levelId/definition`,
  `POST /levels/:levelId/publish`, and `POST /levels/:levelId/archive`; preserve 401
  behavior for missing or invalid tokens; return the standard 403 error envelope
  for authenticated non-admin users; remove level-catalog role decisions from the
  controller; add application and Supertest coverage.
- Out of scope: authentication token format changes; user management changes;
  role persistence changes; new endpoint creation; client changes; closing or
  implementing the broader MAZ-156/CA-003 beyond the concrete level-catalog
  enforcement needed here.

## Behavior

- Public level reads remain public:
  - `GET /levels`
  - `GET /levels/:levelId`
- Level-catalog writes require both authentication and ADMIN authorization:
  - `POST /levels`
  - `PUT /levels/:levelId/definition`
  - `POST /levels/:levelId/publish`
  - `POST /levels/:levelId/archive`
- The auth middleware continues to authenticate the bearer token and attach the
  token payload to the request.
- The framework layer passes the authenticated actor role into the application
  use case through a primitive input field.
- The application layer enforces `actorRole === "ADMIN"` before mutating a
  level.
- An authenticated non-admin actor receives `403` with the standard error
  envelope and no mutation side effect.
- A missing or invalid token receives `401` from the existing auth middleware.
- An ADMIN actor reaches the existing mutation behavior and receives the same
  success status/body as before.

## HTTP contract

- `POST /levels`
  - Auth: `Authorization: Bearer <token>` required.
  - ADMIN success: `201` with `{ status: "success", data: { levelId } }`.
  - Authenticated non-admin: `403` with `{ status: "error", error: { code: "FORBIDDEN", ... } }`.
  - Missing/invalid token: `401` with `{ status: "error", error: { code: "UNAUTHORIZED", ... } }`.
- `PUT /levels/:levelId/definition`
  - Auth: `Authorization: Bearer <token>` required.
  - ADMIN success: `200` with `{ status: "success", data: { levelId } }`.
  - Authenticated non-admin: `403` standard error envelope.
  - Missing/invalid token: `401` standard error envelope.
- `POST /levels/:levelId/publish`
  - Auth: `Authorization: Bearer <token>` required.
  - ADMIN success: `200` with `{ status: "success", data: { levelId } }`.
  - Authenticated non-admin: `403` standard error envelope.
  - Missing/invalid token: `401` standard error envelope.
- `POST /levels/:levelId/archive`
  - Auth: `Authorization: Bearer <token>` required.
  - ADMIN success: `200` with `{ status: "success", data: { levelId } }`.
  - Authenticated non-admin: `403` standard error envelope.
  - Missing/invalid token: `401` standard error envelope.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (no business rules, no infra/framework imports)
- [x] Repositorios: interfaz adentro (port), implementacion afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [x] Invariantes en VO/agregados (no en controllers/services de aplicacion)
- [x] Errores de dominio sin semantica HTTP (mapping HTTP solo en `framework`)

Layer impact:

- Domain: no previsto.
- Application: add or reuse a small authorization policy for level-catalog
  mutations; include `actorRole` as a primitive input in mutation use cases;
  throw the existing application `ForbiddenError` before repository mutation
  when the actor is not ADMIN.
- Infrastructure: no previsto.
- Framework: stop deciding level-catalog ADMIN authorization in
  `LevelCatalogController`; keep request parsing, auth transport extraction, and
  response presentation only; pass the authenticated actor role into the
  application input.

Forbidden moves:

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`,
  `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: none expected because no domain behavior changes.
- Application: authorization policy and/or mutation use-case tests proving ADMIN
  is allowed and USER is forbidden before persistence.
- Adapter/API: Supertest coverage for one representative create mutation and
  every route-specific mutation path: admin succeeds, regular user receives
  403, anonymous receives 401.

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then
  dependencies point inward only.
- Given boundaries are crossed, When DTOs are inspected, Then they are simple
  records/primitives.
- Given level-catalog authorization is involved, When implementation is
  inspected, Then controllers do not contain `role ===`, `role !==`, `isAdmin`,
  or ADMIN decision logic for the mutation authorization.
- Given application mutation use cases are inspected, Then non-admin actors are
  rejected before repository state is changed.

## Edge cases

- Missing authorization header returns 401 before reaching controller/use case.
- Invalid bearer token returns 401 before reaching controller/use case.
- Authenticated non-admin actor returns 403 and does not call the repository save
  path for create/update/publish/archive.
- ADMIN actor with invalid payload still receives the existing validation error
  after authorization passes.
- ADMIN actor with missing level id or nonexistent level receives existing
  not-found behavior after authorization passes.
- Public read endpoints remain accessible without a token.

## Acceptance criteria (Given/When/Then)

- S1: Given no bearer token, When a client calls a level-catalog mutation
  endpoint, Then the API returns 401 with the standard unauthorized envelope.
- S2: Given an authenticated token with role USER, When a client calls any
  level-catalog mutation endpoint, Then the API returns 403 with the standard
  forbidden envelope and no mutation occurs.
- S3: Given an authenticated token with role ADMIN and a valid create payload,
  When the client calls `POST /levels`, Then the API creates the draft level and
  returns 201 with the created `levelId`.
- S4: Given an authenticated token with role ADMIN and a valid definition
  payload, When the client calls `PUT /levels/:levelId/definition`, Then the API
  updates the definition and returns 200 with the `levelId`.
- S5: Given an authenticated token with role ADMIN and an existing level, When
  the client calls `POST /levels/:levelId/publish`, Then the API publishes the
  level and returns 200 with the `levelId`.
- S6: Given an authenticated token with role ADMIN and an existing level, When
  the client calls `POST /levels/:levelId/archive`, Then the API archives the
  level and returns 200 with the `levelId`.
- S7: Given the implementation is inspected, When framework controller files are
  searched, Then level-catalog ADMIN authorization is not decided in the
  controller or route middleware.

## Decisions

- Decision: pass `actorRole` into the level-catalog mutation use-case inputs as
  a primitive string.
  Reason: it keeps the framework responsible for transport extraction while the
  application owns authorization decisions without importing framework code.
  Discarded alternative: keep role checks in `LevelCatalogController`; this is
  the existing behavior but violates MAZ-177/MAZ-156 intent by leaving
  authorization in the framework adapter.
- Decision: use the existing `ForbiddenError` envelope for non-admin actors.
  Reason: it preserves the established API error contract and avoids creating a
  new error family for this narrow enforcement.
  Discarded alternative: return 404 or 401 for non-admin users; those statuses
  would hide the real authorization failure or confuse authentication with
  authorization.
- Decision: do not introduce a new Express role middleware in this slice.
  Reason: MAZ-177 asks for application-layer authorization and controllers must
  not own business authorization. A route middleware would keep the decision in
  the framework layer.
  Discarded alternative: add `requireAdminMiddleware`; it may be convenient but
  would conflict with the Clean Architecture remediation goal.

## Risks / OPEN QUESTIONS

- OPEN QUESTION: MAZ-156/CA-003 is still listed as planned; confirm whether
  MAZ-177 should fully satisfy its level-catalog portion or remain a narrower
  defect fix.
- Risk: existing tests already assert controller-level ForbiddenError behavior;
  implementation must update those tests so they verify transport mapping and
  application enforcement instead of preserving the old controller decision.
