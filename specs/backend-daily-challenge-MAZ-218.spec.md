# Spec - Backend daily challenge generation and cache contract (MAZ-218)

Date: 2026-07-10
Ticket: `MAZ-218`
Source: Linear `MAZ-218` / M12-06A
Status: Backlog, draft for human gate. The `@s` scenarios in
`specs/backend-daily-challenge-MAZ-218.feature` must be approved before TDD.

## Purpose

The backend must expose the daily Arrow Untangle challenge as a server-owned contract:
Gemini runs only in backend infrastructure, a valid challenge is cached by UTC date, and
mobile receives the same validated playable level for the same UTC day without ever
receiving or storing a Gemini API key.

## In scope / Out of scope

- In scope: `GET /daily-challenge`, UTC-date challenge selection, lazy first-request
  generation, one cached result per UTC date, safe fallback generation, validation of
  generated JSON into the existing level-catalog value objects, solvability validation,
  target-difficulty validation, OpenAPI documentation, and server-side Gemini config.
- In scope: a backend cache record that stores the served `LevelDefinition` payload,
  date metadata, target difficulty, source, validation result, and expiry at the next
  UTC midnight.
- Out of scope: mobile UI or routing, admin UI, score/progress submission changes,
  storing a Gemini secret in mobile/admin, background schedulers, EAS Update channels,
  and publishing the daily challenge as a normal catalog `Level`.

## Behavior

`GET /daily-challenge` returns the challenge for the backend clock's current UTC date.
The UTC date key is formatted `YYYY-MM-DD`; all timezone-sensitive logic uses UTC only.

When a valid cache record exists for that UTC date, the backend returns it without
calling Gemini. When the date changes, the cache key changes and a new challenge may be
generated on the first request of the new UTC day.

When no valid cache record exists, the backend attempts Gemini generation through an
application port implemented in infrastructure. Gemini is asked for JSON only; the
backend treats that JSON as untrusted input. The JSON must be parsed into a full
daily-challenge candidate containing:

- `seed`: deterministic date seed, expected to equal `daily-YYYY-MM-DD`.
- `date`: UTC date key, expected to equal the request date.
- `targetDifficulty`: one of the existing backend `Difficulty` enum values.
- `level`: name, description, difficulty, attempts, arrows, optional board shape, and
  optional time limit in the same primitive shape used by level-catalog DTOs.

The application determines `targetDifficulty` deterministically from the UTC date seed.
Gemini must return that same target difficulty and a level with matching `difficulty`.
The exact date-to-difficulty formula is part of the implementation contract and must be
covered by tests before TDD; it is not client-supplied.

Validation succeeds only when:

- the candidate seed/date match the UTC date being served;
- the candidate difficulty equals the target difficulty;
- arrows, attempts, optional board shape, optional board size normalization, and optional
  time limit satisfy existing level-catalog value-object invariants;
- all arrow cells are inside the candidate board shape when a shape is present;
- the candidate is solvable according to `LevelSolvabilityPolicy`;
- the response DTO is composed only of primitives/records and contains no secrets or raw
  provider error details.

If Gemini fails, returns malformed JSON, returns a candidate for the wrong date, returns
an invalid `LevelDefinition`, returns an unsolvable candidate, or misses the target
difficulty, the backend rejects that candidate and serves a deterministic safe fallback.
Fallback uses backend-owned deterministic generation from the same UTC date seed and must
also pass the same validation before being cached and served.

The cache stores the final served result, whether it came from Gemini or fallback. A
fallback is intentionally cacheable for the date so repeated requests do not repeatedly
call Gemini or flap between different challenges.

## HTTP contract

- `GET /daily-challenge`
- Authentication: none required. The endpoint is read-only and user-independent, matching
  public catalog reads; normal authenticated progress/score endpoints remain separate.
- Success: `200`

```json
{
  "status": "success",
  "data": {
    "challenge": {
      "date": "2026-07-10",
      "seed": "daily-2026-07-10",
      "targetDifficulty": "MEDIUM",
      "source": "gemini",
      "generatedAt": "2026-07-10T04:00:00.000Z",
      "expiresAt": "2026-07-11T00:00:00.000Z",
      "validation": {
        "solvable": true,
        "difficultyMatched": true,
        "fallbackUsed": false
      },
      "level": {
        "name": "Daily Challenge 2026-07-10",
        "description": "A validated daily Arrow Untangle puzzle.",
        "difficulty": "MEDIUM",
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
```

- Fallback success remains `200`; `source` is `"fallback"` and
  `validation.fallbackUsed` is `true`.
- Provider details, prompts, stack traces, raw Gemini payloads, and environment variable
  values are never returned in the response body.
- If both Gemini and fallback validation fail, the endpoint returns a controlled `503`
  application error without secrets. This should be rare and must be covered to avoid
  silently serving invalid puzzles.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (provider calls and persistence through ports)
- [x] Repositorios: interfaz adentro (port), implementación afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [x] Invariantes en VO/agregados (level validity and solvability outside controllers)
- [x] Errores de dominio sin semántica HTTP (mapping HTTP only in `framework`)

Layer impact:

- Domain: reuse existing `LevelDefinition`, `ArrowSpec`, `BoardShape`, `TimeLimit`,
  `Difficulty`, `LevelSolvabilityPolicy`, and `RandomLevelStrategy`; no provider, HTTP,
  cache, Prisma, clock, or environment import. If a dedicated `DailyChallenge` value
  object/entity is approved during TDD, it must remain pure and use primitive inputs.
- Application: new daily-challenge use case and ports are expected: challenge cache
  repository, Gemini/source generator port, fallback generator orchestration, clock, and
  deterministic date/difficulty policy. It must parse untrusted provider output through
  existing value objects and return a primitive DTO.
- Infrastructure: Gemini adapter reads `GEMINI_API_KEY` from server environment only;
  Prisma-backed cache repository persists one record per UTC date; provider errors are
  logged/sanitized, not exposed.
- Framework: public route/controller/wiring for `GET /daily-challenge`, environment
  validation for optional Gemini config, and OpenAPI schemas/examples. Controller only
  delegates and presents the use-case output.

Forbidden moves:

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, provider SDKs, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework` or reading environment variables directly
- [ ] Controllers/middleware containing challenge generation, cache, difficulty, or fallback business rules
- [ ] DTOs exposing domain entities, `Date`, provider SDK objects, raw Gemini payloads, prompts, or secrets
- [ ] Prisma client used outside `src/infrastructure`
- [ ] `GEMINI_API_KEY` or provider secrets added to mobile/admin code, docs, test fixtures, or logs

Required tests after human approval:

- Domain/application: UTC date key and next-midnight expiry are UTC-only; target difficulty
  is deterministic for the date; provider candidates with wrong date/seed/difficulty are
  rejected; invalid ArrowSpec/LevelDefinition/shape/time-limit payloads are rejected;
  unsolvable candidates are rejected; fallback result validates before use.
- Application: cache hit does not call Gemini; cache miss calls Gemini once; valid Gemini
  result is cached; invalid/failing Gemini path caches and serves fallback; total failure
  returns a controlled error.
- Infrastructure: Gemini adapter sends no secrets to logs/responses; cache repository
  reads/writes by UTC date with a unique date key; environment config keeps
  `GEMINI_API_KEY` backend-only.
- Adapter/API: `GET /daily-challenge` returns the success body, reuses cache for repeated
  same-date requests, returns the next day's challenge after UTC date changes, documents
  the endpoint in OpenAPI, and never leaks provider internals.

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then dependencies point inward only.
- Given provider/cache boundaries are crossed, When DTOs are inspected, Then they are simple records/primitives and contain no `Date`, domain entities, SDK objects, prompts, or secrets.
- Given challenge validity is involved, When implementation is inspected, Then level invariants and solvability are enforced through domain value objects/policies, not controllers or Prisma adapters.
- Given Gemini is configured, When mobile/admin repositories are inspected, Then no `GEMINI_API_KEY` or direct Gemini client exists outside backend infrastructure/configuration.

## Edge cases

- Existing valid cache for date: return cached challenge without provider call.
- Cache record date differs from current UTC date: ignore it for the current request.
- Two users in different local timezones but same backend UTC date: same challenge body.
- UTC date rolls over between requests: new date key and new challenge body.
- Gemini unavailable, times out, returns non-JSON, malformed JSON, wrong date, wrong seed,
  wrong difficulty, invalid arrows, duplicate arrow ids, invalid attempts, invalid shape,
  invalid time limit, or unsolvable puzzle: fallback is served.
- Fallback generation unexpectedly fails validation: controlled `503`, no secrets.
- No `GEMINI_API_KEY` configured in local/dev: endpoint still serves fallback; production
  deployment may require the variable by environment policy.

## Acceptance criteria (Given/When/Then)

- S1: Given the architecture and repositories are inspected, When MAZ-218 is implemented, Then no Gemini API key or direct Gemini client exists in mobile/admin and backend exposes only a first-party endpoint.
- S2: Given no cached challenge exists for the current UTC date and Gemini returns a valid candidate, When `GET /daily-challenge` is requested, Then the backend validates, caches, and returns that candidate with `source: "gemini"`.
- S3: Given a valid cached challenge exists for the current UTC date, When `GET /daily-challenge` is requested again, Then the backend returns the cached challenge and does not call Gemini.
- S4: Given Gemini returns invalid JSON or a structurally invalid level payload, When the backend validates it, Then it rejects the candidate and returns a validated fallback with no provider details leaked.
- S5: Given Gemini returns an unsolvable candidate, When the backend validates it with `LevelSolvabilityPolicy`, Then it rejects the candidate and returns a validated fallback.
- S6: Given Gemini returns a candidate outside the target difficulty or for the wrong UTC date/seed, When the backend validates it, Then it rejects the candidate and returns a validated fallback.
- S7: Given the backend clock advances to a new UTC date, When `GET /daily-challenge` is requested, Then the response uses the new UTC date, seed, expiry, and challenge cache key.
- S8: Given two users in different local timezones request during the same backend UTC date, When they call `GET /daily-challenge`, Then they receive the same challenge payload.
- S9: Given both Gemini and fallback validation fail, When `GET /daily-challenge` is requested, Then the backend returns a controlled `503` error without secrets, raw provider payloads, or stack traces.

## Decisions

- Keep Gemini server-side behind a backend-owned endpoint.
  Reason: protects `GEMINI_API_KEY` and gives backend authority over validation/cache.
  Alternative discarded: mobile/admin calling Gemini directly.
- Use lazy generation on the first request per UTC date.
  Reason: satisfies M12 without adding a scheduler or release-time generated assets.
  Alternative discarded: background job/serverless scheduled generation.
- Cache the final served result, including fallback, by UTC date.
  Reason: all users should see the same daily challenge and invalid provider behavior should
  not cause repeated calls or inconsistent puzzles.
  Alternative discarded: regenerate fallback on every failed provider request.
- Make `GET /daily-challenge` unauthenticated.
  Reason: the response is user-independent and mirrors public `GET /levels`; progress and
  score writes remain authenticated elsewhere.
  Alternative discarded: require auth for a read-only public puzzle contract.
- Validate provider output through existing level-catalog domain rules before serving.
  Reason: Gemini output is untrusted and must not bypass ArrowSpec, board shape, attempts,
  time-limit, difficulty, or solvability invariants.
  Alternative discarded: trusting provider JSON once it parses.

## Risks / OPEN QUESTIONS

- Human gate must approve the exact `GET /daily-challenge` response shape and public-auth decision.
- Human gate must approve the deterministic date-to-difficulty policy before TDD writes code.
- Implementation must choose whether the cache is a new Prisma model/table or a constrained
  reuse of existing catalog storage; the spec recommends a dedicated cache because daily
  challenges are not normal published catalog levels.
