# Spec - Leaderboard Submit/Read Contract Hardening (Backend)

Date: 2026-06-29
Ticket: `MAZ-173`
Source: Linear issue `MAZ-173` and M9 audit notes
Status: Backlog / pending executable contract approval. The `@s` scenarios in
`specs/leaderboard-submit-read-contract.feature` are the executable contract for
this slice.

## Purpose

Harden the backend leaderboard HTTP contract so clients submit only gameplay
facts, while the server owns leaderboard ids, entry ids, and username snapshots;
also make leaderboard reads distinguish a known level with no scores from an
unknown level.

## In scope / Out of scope

- In scope: slim `POST /leaderboard/scores` request input to `{ levelId, score,
  timeSeconds, movesCount }`; derive `userId` from the bearer token; derive
  `usernameSnapshot` from the authenticated user record; generate
  `leaderboardId` and `entryId` on the server; ignore spoofed client id/username
  fields; validate known level existence for reads; return `200` with
  `entries: []` for a known level with no leaderboard entries; keep `404` for
  unknown levels; update OpenAPI/examples and backend tests.
- Out of scope: client implementation for MAZ-183/MAZ-184; changing scoring or
  best-score upsert rules from MAZ-172; changing login/session mechanics from
  MAZ-174; adding username to the JWT payload unless the team explicitly chooses
  that alternative.

## Behavior

- `POST /leaderboard/scores` remains authenticated.
- Accepted submit body fields are:
  - `levelId`
  - `score`
  - `timeSeconds`
  - `movesCount`
- `leaderboardId`, `entryId`, `userId`, and `usernameSnapshot` are not accepted
  as client-owned fields. If present, they are ignored rather than trusted.
- The server obtains `userId` from the verified token.
- The application layer loads the authenticated user by `userId` and uses the
  persisted username as `usernameSnapshot`.
- The application layer generates a new `EntryId` for each accepted submit.
- When the first score for a known level is submitted, the application creates a
  leaderboard aggregate with a server-generated `LeaderboardId`.
- `GET /leaderboard/:levelId` returns:
  - `200` with ranked entries when a leaderboard exists.
  - `200` with `{ levelId, entries: [] }` for a known level that has no scores
    yet.
  - `404` for an unknown/nonexistent level.
- Invalid UUID `levelId` remains a validation error from the existing value
  object/error mapping.

## HTTP contract

- `POST /leaderboard/scores`
  - Auth: `Authorization: Bearer <token>` required.
  - Request body:
    ```json
    {
      "levelId": "550e8400-e29b-41d4-a716-446655440010",
      "score": 1200,
      "timeSeconds": 42,
      "movesCount": 7
    }
    ```
  - Success: `201` with `{ "status": "success", "data": null }`.
  - Missing/invalid token: `401` standard error envelope.
  - Missing required gameplay field: `400` standard error envelope.
  - Unknown user from token: existing `404` user-not-found behavior from
    MAZ-174 unless the team chooses to remap stale-token users to `401`.
  - Unknown level: `404` standard error envelope.
  - Invalid score/time/move values: existing validation error envelope.
- `GET /leaderboard/:levelId`
  - Auth: none.
  - Existing leaderboard: `200` with current leaderboard DTO.
  - Known level without scores: `200` with at least `{ "levelId": "...", "entries": [] }`.
  - Unknown level: `404` standard error envelope.

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

- Domain: no new aggregate or rule expected. Reuse `Leaderboard`, `ScoreEntry`,
  `LeaderboardId.generate()`, `EntryId.generate()`, `UserId`, `LevelId`, and
  existing value objects. No framework or persistence imports.
- Application: slim `SubmitScoreInput`; inject/reuse `UserRepository` to derive
  username; inject/reuse `LevelRepository` to validate known levels; generate
  server-owned ids through existing value objects; adapt
  `GetLeaderboardService` so known levels without leaderboard rows return an
  empty leaderboard DTO instead of `NotFoundError`.
- Infrastructure: no schema change expected. Existing Prisma repositories remain
  adapters for application ports.
- Framework: parse only the slim submit DTO from HTTP, ignore extra id/username
  fields, keep auth extraction in middleware/controller, update Swagger/OpenAPI
  examples and schemas.

Forbidden moves:

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`,
  `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: none expected unless implementation changes leaderboard/entity
  behavior.
- Application: submit generates ids, derives username from `UserRepository`,
  ignores spoofed username/id inputs, validates known levels, and read returns
  empty entries for known scoreless levels while keeping unknown levels 404.
- Adapter/API: Supertest happy submit with slim body, spoofed fields ignored,
  unauthorized submit 401, missing fields 400, GET known-empty 200, GET unknown
  404, UUID-path behavior with real UUID-like ids.

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then
  dependencies point inward only.
- Given request DTOs cross into application, When submit input is inspected,
  Then it contains gameplay facts plus authenticated identity context, not
  client-owned surrogate ids or username snapshots.
- Given username snapshot is stored, When implementation is inspected, Then it
  is derived from the authenticated persisted user and not from request body.
- Given a known level has no leaderboard row, When read use case executes, Then
  it does not create a persistence side effect just to answer an empty board.

## Edge cases

- Missing token on submit returns 401 before use case execution.
- Invalid token on submit returns 401 before use case execution.
- Submit body includes `leaderboardId`, `entryId`, `userId`, or
  `usernameSnapshot`; server ignores those values and uses server-derived data.
- Submit body omits `levelId`, `score`, `timeSeconds`, or `movesCount`; server
  returns 400.
- Submit references an unknown level; server returns 404.
- Submit token references a user that no longer exists; server returns the
  current MAZ-174 user-not-found behavior unless remapped by team decision.
- Read references a known level with no leaderboard row; server returns 200 with
  empty entries.
- Read references an unknown level; server returns 404.
- Read uses a malformed `levelId`; existing validation behavior applies.

## Acceptance criteria (Given/When/Then)

- S1: Given an authenticated user and a submit body containing only `levelId`,
  `score`, `timeSeconds`, and `movesCount`, When the client posts to
  `/leaderboard/scores`, Then the server stores the entry with server-generated
  leaderboard/entry ids and the username from the authenticated user record.
- S2: Given an authenticated user and a submit body that attempts to provide
  `leaderboardId`, `entryId`, `userId`, or `usernameSnapshot`, When the client
  posts to `/leaderboard/scores`, Then the server ignores those spoofed fields
  and persists only server-owned ids plus the real authenticated username.
- S3: Given no bearer token or an invalid bearer token, When the client posts to
  `/leaderboard/scores`, Then the API returns 401 with the standard unauthorized
  envelope.
- S4: Given an authenticated user and a submit body missing a required gameplay
  field, When the client posts to `/leaderboard/scores`, Then the API returns
  400 with the standard bad-request envelope.
- S5: Given a known level that has no leaderboard scores, When the client gets
  `/leaderboard/:levelId`, Then the API returns 200 with `entries: []`.
- S6: Given an unknown/nonexistent level id, When the client gets
  `/leaderboard/:levelId`, Then the API returns 404 with the standard not-found
  envelope.
- S7: Given the OpenAPI contract is inspected, When `SubmitScoreRequest` is
  read, Then only `levelId`, `score`, `timeSeconds`, and `movesCount` are
  required and no client-owned id or username field is documented.

## Decisions

- Decision: derive `usernameSnapshot` through `UserRepository` in the submit use
  case, reusing the MAZ-174 current-user path concept.
  Reason: the current `TokenPayload` contains only `userId` and `role`; using
  the persisted user avoids a token schema migration and prevents stale username
  claims.
  Discarded alternative: add `username` to JWT payload; this would reduce a repo
  lookup but expands auth token semantics and requires migration/refresh
  decisions outside this slice.
- Decision: return a virtual empty leaderboard response for known scoreless
  levels without creating a leaderboard row on GET.
  Reason: reads should not mutate persistence just to avoid 404, and Linear only
  requires `entries: []` for the empty state.
  Discarded alternative: create an empty leaderboard row during read; this adds a
  side effect to a public GET and complicates id/updatedAt semantics.
- Decision: ignore spoofed id/username fields rather than reject the whole
  submit body when required gameplay fields are present.
  Reason: the security invariant is that these fields are not trusted. Ignoring
  them makes backward-compatible clients safer during rollout.
  Discarded alternative: reject any extra fields with 400; stricter, but not
  required by the ticket and risks breaking old clients before MAZ-183 lands.

## Affected tickets

- `MAZ-172`: best-score upsert is assumed and must not be changed here.
- `MAZ-174`: `GET /users/me` and `GetCurrentUserUseCase` provide the precedent
  for loading authenticated user data; MAZ-173 should reuse the same identity
  source rather than trusting request body username.
- `MAZ-183`: client must stop sending slug ids and use backend UUID level ids;
  this backend contract still requires UUID `levelId`.
- `MAZ-184`: client empty-state and replay UX depend on backend returning
  `200` with empty entries for known scoreless levels.

## Risks / OPEN QUESTIONS

- OPEN QUESTION: Should a stale token whose user no longer exists remain 404
  (MAZ-174 current behavior) or be remapped to 401 for submit? The contract
  currently preserves MAZ-174 behavior.
- Risk: changing `GetLeaderboardOutput` to allow an empty response without
  `leaderboardId`/`updatedAt` may require client DTO fixture updates in
  MAZ-184.
