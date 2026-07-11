# Spec - Admin manual daily challenge iteration (MAZ-224)

Date: 2026-07-11
Ticket: `MAZ-224`
Source: Linear `MAZ-224` / M12-06D
Status: Backlog, draft for human gate. The `@s` scenarios in
`specs/backend-daily-challenge-manual-iteration-MAZ-224.feature` must be approved
before TDD.

## Purpose

Allow an authenticated admin to manually request a new validated Daily Challenge for a UTC
date, replace the existing cached challenge only after a successful generation, and expose a
sanitized operation log that the admin dashboard can poll while the iteration runs.

## In scope / Out of scope

- In scope: admin-only manual daily challenge iteration command, optional UTC date input,
  replacement of an existing daily challenge for that date, operation status/log DTOs,
  polling endpoint for live admin logs, reuse of the MAZ-218 Gemini/fallback validation
  pipeline, OpenAPI and README/admin endpoint documentation.
- In scope: preserving the previous successful challenge when a new iteration fails.
- In scope: preventing concurrent iteration operations for the same UTC date.
- Out of scope: editing arrows or board JSON manually, changing the public
  `GET /daily-challenge` response shape, mobile changes, admin frontend implementation,
  background schedulers, SSE/WebSocket streaming, storing raw prompts/provider payloads,
  and exposing Gemini secrets.

## Behavior

The backend exposes an admin command endpoint:

- `POST /admin/daily-challenge/iterations`

The request body is optional. If `date` is omitted, the backend uses the current backend UTC
date. If `date` is provided, it must be a valid UTC date key in `YYYY-MM-DD` format and must
not be in the future relative to the backend clock. Invalid or future dates are rejected
before any generator is called.

The command is guarded by the existing transport auth stack:

- unauthenticated requests return `401`;
- authenticated non-admin requests return `403`;
- rejected auth requests do not start an operation, do not call Gemini/fallback, and do not
  modify the cache.

When an admin request is accepted, the backend creates an iteration operation with an
opaque `operationId`, the target date, status `RUNNING`, and a first `REQUESTED` event. The
admin dashboard polls:

- `GET /admin/daily-challenge/iterations/:operationId`

to display ordered operation events until the operation reaches `SUCCEEDED` or `FAILED`.
This slice uses polling rather than SSE/WebSockets to keep the backend contract simple and
testable; the admin frontend can still render it as a live log.

Only one operation may run per UTC date at a time. A second admin request for the same date
while an operation is `RUNNING` returns `409` and the existing running operation summary
without starting another generation.

The generation pipeline reuses MAZ-218 rules: Gemini is attempted first when configured,
the fallback generator is used when Gemini fails or returns invalid output, and every
candidate is validated through existing level-catalog value objects and
`LevelSolvabilityPolicy` before it can be stored. Provider output remains untrusted.

Replacement is atomic from the public reader's perspective:

- the previous cached daily challenge remains visible through `GET /daily-challenge` until
  a new candidate has fully validated and the cache replacement succeeds;
- after success, `GET /daily-challenge` for that UTC date returns the new iteration;
- if generation, fallback validation, or persistence fails, the previous successful
  challenge remains available and the operation ends as `FAILED`.

Operation events are sanitized records. They may include stable event types, timestamps,
the chosen source (`gemini` or `fallback`), fallback usage, validation flags, replacement
status, and sanitized error codes/messages. They must never include Gemini API keys,
environment values, prompts, raw provider payloads, stack traces, or provider exception
details.

Suggested event types:

- `REQUESTED`
- `GENERATION_STARTED`
- `GENERATOR_SELECTED`
- `CANDIDATE_REJECTED`
- `FALLBACK_USED`
- `VALIDATION_PASSED`
- `CACHE_REPLACED`
- `FAILED`

The operation log is not a domain aggregate. It is an application DTO persisted or exposed
through an application port implemented by infrastructure so framework polling can read it
without coupling application to Prisma or Express.

## HTTP contract

### Start an iteration

- `POST /admin/daily-challenge/iterations`
- Auth: Bearer token required; `ADMIN` role required through `authMiddleware` +
  `requireAdmin`.
- Body:

```json
{
  "date": "2026-07-11"
}
```

`date` is optional. Omit it to target the backend current UTC date.

- Accepted: `202`

```json
{
  "status": "success",
  "data": {
    "operation": {
      "operationId": "f39dd177-bde0-4fd8-84cb-8cd353ffc224",
      "date": "2026-07-11",
      "status": "RUNNING",
      "requestedAt": "2026-07-11T14:00:00.000Z",
      "completedAt": null,
      "events": [
        {
          "sequence": 1,
          "type": "REQUESTED",
          "message": "Daily challenge iteration requested",
          "createdAt": "2026-07-11T14:00:00.000Z"
        }
      ],
      "challenge": null
    }
  }
}
```

- Already running for the date: `409`

```json
{
  "status": "error",
  "error": {
    "code": "DAILY_CHALLENGE_ITERATION_IN_PROGRESS",
    "message": "Daily challenge iteration already in progress"
  },
  "data": {
    "operation": {
      "operationId": "f39dd177-bde0-4fd8-84cb-8cd353ffc224",
      "date": "2026-07-11",
      "status": "RUNNING"
    }
  }
}
```

- Invalid date: `400` with code `INVALID_DAILY_CHALLENGE_DATE`.
- Unauthenticated: `401`.
- Non-admin: `403`.

### Poll an iteration operation

- `GET /admin/daily-challenge/iterations/:operationId`
- Auth: Bearer token required; `ADMIN` role required.
- Success: `200`

```json
{
  "status": "success",
  "data": {
    "operation": {
      "operationId": "f39dd177-bde0-4fd8-84cb-8cd353ffc224",
      "date": "2026-07-11",
      "status": "SUCCEEDED",
      "requestedAt": "2026-07-11T14:00:00.000Z",
      "completedAt": "2026-07-11T14:00:04.000Z",
      "events": [
        {
          "sequence": 1,
          "type": "REQUESTED",
          "message": "Daily challenge iteration requested",
          "createdAt": "2026-07-11T14:00:00.000Z"
        },
        {
          "sequence": 2,
          "type": "GENERATOR_SELECTED",
          "message": "Gemini generation selected",
          "source": "gemini",
          "createdAt": "2026-07-11T14:00:01.000Z"
        },
        {
          "sequence": 3,
          "type": "VALIDATION_PASSED",
          "message": "Generated challenge passed validation",
          "source": "gemini",
          "fallbackUsed": false,
          "createdAt": "2026-07-11T14:00:03.000Z"
        },
        {
          "sequence": 4,
          "type": "CACHE_REPLACED",
          "message": "Daily challenge cache replaced",
          "createdAt": "2026-07-11T14:00:04.000Z"
        }
      ],
      "challenge": {
        "date": "2026-07-11",
        "seed": "daily-2026-07-11",
        "targetDifficulty": "HARD",
        "source": "gemini",
        "generatedAt": "2026-07-11T14:00:03.000Z",
        "expiresAt": "2026-07-12T00:00:00.000Z",
        "validation": {
          "solvable": true,
          "difficultyMatched": true,
          "fallbackUsed": false
        },
        "level": {
          "name": "Daily Challenge 2026-07-11",
          "description": "A validated daily Arrow Untangle puzzle.",
          "difficulty": "HARD",
          "definition": {
            "attempts": 5,
            "arrows": [
              {
                "id": "arrow-0",
                "color": "#4B6BFB",
                "path": [{ "row": 0, "col": 0 }],
                "direction": "RIGHT"
              }
            ],
            "boardShape": {
              "type": "CELL_MASK",
              "cells": [{ "row": 0, "col": 0 }]
            }
          },
          "timeLimitSeconds": 120
        }
      }
    }
  }
}
```

- Unknown operation: `404` with code `DAILY_CHALLENGE_ITERATION_NOT_FOUND`.
- Unauthenticated: `401`.
- Non-admin: `403`.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (provider/cache/log operations through ports)
- [x] Repositorios: interfaz adentro (port), implementación afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [x] Invariantes en VO/agregados (level validity and solvability outside controllers)
- [x] Errores de dominio sin semántica HTTP (mapping HTTP only in `framework`)

Layer impact:

- Domain: no new domain entity is required for the operation log. Reuse existing
  `Difficulty`, level-catalog value objects, and `LevelSolvabilityPolicy` through the
  MAZ-218 validation path. Domain must not import cache, operation logging, Express, Prisma,
  Gemini, or environment configuration.
- Application: expected new use cases: start manual iteration and read iteration operation.
  Expected ports: daily challenge operation repository/log store, id generator, clock, and
  existing generator/cache ports. Application coordinates validation/replacement through
  ports and returns primitive DTOs.
- Infrastructure: expected Prisma-backed operation store and any cache replacement method
  needed for atomic date replacement. Gemini adapter remains backend-only and keeps provider
  details sanitized.
- Framework: expected admin routes/controller/wiring for
  `POST /admin/daily-challenge/iterations` and
  `GET /admin/daily-challenge/iterations/:operationId`, guarded by `authMiddleware` +
  `requireAdmin`, plus OpenAPI/README updates.

Forbidden moves:

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, provider SDKs, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework` or reading environment variables directly
- [ ] Controllers/middleware containing generation, validation, fallback, cache replacement, or operation-log business rules
- [ ] DTOs exposing domain entities, `Date`, provider SDK objects, raw Gemini payloads, prompts, stack traces, or secrets
- [ ] Prisma client used outside `src/infrastructure`
- [ ] Admin/mobile repositories receiving `GEMINI_API_KEY` or direct provider clients

Required tests after human approval:

- Application: admin iteration for omitted date uses backend UTC date; provided date validates;
  future/invalid dates fail before generation; unauthorized actors never call generators; valid
  Gemini result creates/replaces cache; existing challenge remains on failure; fallback path
  stores fallback and logs fallback usage; duplicate running operation returns conflict.
- Infrastructure: operation repository stores ordered events and terminal status; cache
  replacement by date is atomic; persisted operations do not store raw provider payloads or
  secrets.
- Adapter/API: admin auth status codes (`401`, `403`); start endpoint returns `202`; poll
  endpoint returns ordered events and terminal challenge; unknown operation returns `404`;
  conflict returns `409`; OpenAPI documents the endpoints and schemas.

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then dependencies point inward only.
- Given provider/cache/log boundaries are crossed, When DTOs are inspected, Then they are simple records/primitives and contain no `Date`, domain entities, SDK objects, prompts, raw provider payloads, stack traces, or secrets.
- Given challenge validity is involved, When implementation is inspected, Then level invariants and solvability are enforced through domain value objects/policies, not controllers or Prisma adapters.
- Given admin auth is required, When routes are inspected, Then `authMiddleware` and `requireAdmin` guard both iteration endpoints before controller execution.

## Pattern(s)

- Controller (existing local pattern): framework controller parses HTTP and delegates to use cases.
  Alternative discarded: generation logic inside routes/controllers.
- Adapter (existing local pattern): Prisma operation/cache stores and Gemini generator remain
  infrastructure adapters behind application ports. Alternative discarded: importing Prisma or
  provider clients in application.

## Edge cases

- Missing token: `401`, no operation created, no generator called.
- Authenticated `USER`: `403`, no operation created, no generator called.
- Omitted date: current backend UTC date is used.
- Invalid date key: `400`, no operation created, no generator called.
- Future date key: `400`, no operation created, no generator called.
- Existing daily challenge for date: kept until new candidate validates and cache replacement
  succeeds; replaced after success.
- No existing daily challenge for date: successful operation creates the first cached challenge.
- Gemini returns valid challenge: operation succeeds with `source: "gemini"` and
  `fallbackUsed: false`.
- Gemini fails or returns invalid/unsolvable/wrong-date candidate: fallback is attempted and
  logs `FALLBACK_USED`.
- Gemini and fallback both fail: operation ends `FAILED`, previous challenge remains available,
  sanitized failure is visible in operation log.
- Duplicate running operation for same date: `409`, no second generation starts.
- Polling unknown operation id: `404`.
- Operation events remain ordered by `sequence` even if multiple events share the same timestamp.

## Acceptance criteria (Given/When/Then)

- S1: Given no cached challenge exists for today's backend UTC date, When an ADMIN starts a manual iteration without a date, Then the backend accepts the operation and eventually stores a validated Daily Challenge for today's date.
- S2: Given a cached challenge already exists for a UTC date, When an ADMIN starts a manual iteration for that date and generation succeeds, Then the previous cache entry is atomically replaced and public `GET /daily-challenge` returns the new challenge for that date.
- S3: Given Gemini returns a valid challenge, When manual iteration completes, Then the operation log records source `gemini`, `fallbackUsed: false`, validation success, and cache replacement without exposing secrets or raw provider data.
- S4: Given Gemini is unavailable or returns an invalid candidate, When fallback generation validates, Then the operation succeeds with source `fallback`, logs fallback usage, and stores the fallback challenge.
- S5: Given a cached challenge exists and both Gemini and fallback fail validation, When manual iteration runs, Then the operation ends `FAILED`, the previous public challenge remains available, and the failure log is sanitized.
- S6: Given an unauthenticated caller calls the start endpoint, When authorization fails, Then no operation is created, no generator is called, and the cache is unchanged.
- S7: Given a non-admin authenticated caller calls the start endpoint, When authorization fails, Then no operation is created, no generator is called, and the cache is unchanged.
- S8: Given an ADMIN has an operation id, When the admin polls the operation endpoint, Then the backend returns ordered events until `SUCCEEDED` or `FAILED`.
- S9: Given an operation is already `RUNNING` for a UTC date, When an ADMIN starts another iteration for the same date, Then the backend returns `409` with the running operation summary and does not start a second generation.
- S10: Given an invalid UTC date is submitted, When an ADMIN starts manual iteration, Then the backend returns `400` and does not call any generator.
- S11: Given a future UTC date is submitted, When an ADMIN starts manual iteration, Then the backend returns `400` and does not call any generator.
- S12: Given Clean Architecture is reviewed, When imports and DTOs are inspected, Then domain/application do not depend on framework/infrastructure/provider SDKs and no response/log exposes secrets, prompts, raw provider payloads, or stack traces.

## Decisions

- **Use admin `/admin/daily-challenge/iterations` endpoints.**
  Reason: the operation is an admin command and log view, separate from public
  `GET /daily-challenge`.
  Alternative discarded: overloading `GET /daily-challenge` or adding a public mutation.
- **Use polling operation logs instead of SSE/WebSockets in this slice.**
  Reason: satisfies the admin "live log" need with a small HTTP contract and avoids runtime
  streaming infrastructure.
  Alternative discarded: SSE/WebSocket stream, which can be a later enhancement if polling is
  insufficient.
- **Replace cache only after a candidate validates.**
  Reason: public consumers should never lose the previous working daily challenge because a
  manual iteration failed.
  Alternative discarded: clearing the cache before generation starts.
- **Reject concurrent operations for the same date.**
  Reason: avoids race conditions and makes the admin log deterministic.
  Alternative discarded: queueing or last-write-wins concurrent generation.
- **Reject future dates.**
  Reason: the ticket targets the current daily challenge; future scheduling is a different
  product behavior.
  Alternative discarded: allowing future-dated pre-generation.

## Risks / OPEN QUESTIONS

- Human gate must approve the polling contract (`POST` + `GET operation`) before TDD.
- Human gate must confirm whether rejecting future dates is the desired product rule.
- Implementation must choose exact persistence shape for operation logs and may need a Prisma
  migration. That choice belongs to the approved TDD implementation after this contract.
