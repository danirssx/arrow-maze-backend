# Spec - CORS multi-origin for admin web (Backend)

Date: 2026-07-02
Ticket: `MAZ-198` (plan id `BE-04`)
Source: `../Vertiente1-AdminDashboard-Tickets.md` (M11 - Admin Dashboard) and Linear `MAZ-198`
Status: Approved by human on 2026-07-02. The `@s` scenarios in
`specs/admin-cors-multi-origin-MAZ-198.feature` are the executable contract for this slice.

## Purpose

Allow the backend CORS configuration to accept both the existing Expo client origin and the
upcoming admin web origin from a single `CORS_ORIGIN` environment variable. The admin SPA must
be able to call the API without breaking the mobile development origin or accidentally allowing
arbitrary origins.

## In scope / Out of scope

- In scope: parse `CORS_ORIGIN` as a comma-separated list, wire Express `cors()` with the
  allowed origins, cover allowed and disallowed origin behavior, and document the env format in
  `.env.example` and `README.md`.
- Out of scope: creating the admin web repo, changing admin routes, adding OpenAPI docs for
  `/admin/*`, or changing authentication/authorization.

## Behavior

`CORS_ORIGIN` accepts one or more exact origins separated by commas. Whitespace around entries is
ignored and empty entries are discarded. If the variable is absent, the backend keeps the existing
local default `http://localhost:8081`.

For a request with an `Origin` header that exactly matches one configured origin, the response
includes `Access-Control-Allow-Origin` with that same origin. For an origin that is not configured,
the response does not include `Access-Control-Allow-Origin`; the HTTP endpoint may still run, but
the browser blocks cross-origin access. Requests without an `Origin` header remain usable for
server-to-server tools and health checks.

## HTTP contract

- `CORS_ORIGIN=http://localhost:8081,http://localhost:5173` permits both origins.
- Allowed origin request -> response contains `Access-Control-Allow-Origin: <request origin>`.
- Disallowed origin request -> response omits `Access-Control-Allow-Origin`.
- No `Origin` header -> request is not rejected by CORS.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (unchanged; no application code)
- [x] Repositorios: interfaz adentro (n/a - no repositories)
- [x] DTOs simples en fronteras (n/a - no DTOs)
- [x] Invariantes en VO/agregados (n/a - no domain invariants)
- [x] Errores de dominio sin semántica HTTP (unchanged; no error mapping change)

Layer impact:

- Domain: no previsto.
- Application: no previsto.
- Infrastructure: no previsto.
- Framework: update environment loading to expose configured CORS origins and wire Express
  `cors()` with the multi-origin allowlist.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`,
  `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: none.
- Application: none.
- Adapter/API: environment parser tests for comma-separated origins and supertest coverage for
  allowed Expo origin, allowed admin origin, disallowed origin, and no-origin health checks.

Architecture acceptance criteria:

- Given this is framework configuration, When imports are inspected, Then changes stay in
  `src/framework` and do not touch domain/application/infrastructure.
- Given CORS is a transport/browser concern, When implementation is inspected, Then it does not
  add business rules to controllers, middleware, domain, or application use cases.

## Edge cases

- `CORS_ORIGIN=http://localhost:8081, http://localhost:5173` trims the second entry.
- `CORS_ORIGIN=http://localhost:8081,,http://localhost:5173` ignores the empty entry.
- Unknown origins receive no CORS allow header.
- Requests without an `Origin` header remain accepted.

## Acceptance criteria (Given/When/Then)

- S1: Given `CORS_ORIGIN` contains the Expo origin and the admin web origin, When a request comes
  from the Expo origin, Then the response allows that origin.
- S2: Given the same configured origins, When a request comes from the admin web origin, Then the
  response allows that origin.
- S3: Given the same configured origins, When a request comes from any other origin, Then the
  response does not allow that origin.
- S4: Given no `Origin` header, When a request reaches the API, Then it is not rejected by the CORS
  configuration.
- S5: Given `CORS_ORIGIN` contains spaces or empty comma entries, When the environment is loaded,
  Then only non-empty trimmed origins are configured.

## Decisions

- **Use the existing `CORS_ORIGIN` name** instead of adding `CORS_ORIGINS`. The ticket explicitly
  asks for `CORS_ORIGIN` to accept a comma-separated list and this keeps deployment config
  backward compatible.
- **Block by omitting CORS allow headers, not by throwing an HTTP error.** Browsers enforce CORS
  based on the response headers. Returning a generic server error for an untrusted `Origin` would
  turn a transport policy into application behavior and would make non-browser diagnostics noisier.
- **Exact origin matching only.** Wildcards and regex are out of scope for the admin dashboard and
  would broaden the attack surface.

## Risks / OPEN QUESTIONS

- The admin web production origin is not known yet. Operators must add it to `CORS_ORIGIN` at
  deploy time.
