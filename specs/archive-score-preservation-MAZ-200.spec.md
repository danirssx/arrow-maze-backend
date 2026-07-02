# Spec - Archive preserves leaderboard and progress (Backend)

Date: 2026-07-02
Ticket: `MAZ-200` (plan id `BE-06`)
Source: `../Vertiente1-AdminDashboard-Tickets.md` (M11 - Admin Dashboard) and Linear `MAZ-200`
Status: Approved by human on 2026-07-02. The `@s` scenarios in
`specs/archive-score-preservation-MAZ-200.feature` are the executable contract for this slice.

## Purpose

Guarantee that archiving a published level is a soft state change only. The archived level must
disappear from the public level catalog, but player leaderboard entries and progress for that level
must remain readable so the admin dashboard can support the "archive + recreate without losing
score history" workflow.

## In scope / Out of scope

- In scope: add regression tests proving archive persistence boundaries for leaderboard, progress,
  public level listing, and leaderboard read behavior for archived levels.
- Out of scope: changing archive semantics, deleting levels, adding admin frontend UI, changing
  leaderboard ranking rules, changing progress merge rules, or adding new endpoints.

## Behavior

When an ADMIN archives a PUBLISHED level, `ArchiveLevelUseCase` loads and saves only the target
level through `LevelRepository`. It must not call leaderboard or progress repositories, and it must
not delete any related rows. Existing persistence relations already restrict level deletion and
keep `Leaderboard`, `LeaderboardEntry`, `PlayerProgress`, and `CompletedLevel` keyed by `levelId`.

After archive:

- `GET /levels` still uses `findAllPublished`, so archived levels are not offered to players.
- `GET /leaderboard/:levelId` remains readable for the archived level because
  `GetLeaderboardService` reads leaderboard by `levelId` and does not filter by level status.
- Player progress still records/completes archived `levelId` history because completed levels are
  stored separately and are not touched by archive.

## HTTP contract

- `POST /levels/:levelId/archive` keeps the existing admin-gated contract and returns the archived
  `levelId`.
- `GET /levels` returns only PUBLISHED levels; archived levels are absent.
- `GET /leaderboard/:levelId` returns 200 with entries for an archived level when a leaderboard
  exists for that `levelId`.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (archive remains an aggregate state transition)
- [x] Application solo orquesta (use cases coordinate repositories only)
- [x] Repositorios: interfaz adentro (tests use ports/fakes; Prisma stays infrastructure)
- [x] DTOs simples en fronteras (no new DTO shape expected)
- [x] Invariantes en VO/agregados (level status transition remains in `Level.archive`)
- [x] Errores de dominio sin semántica HTTP (unchanged)

Layer impact:

- Domain: no production change expected; use existing `Level.archive` behavior.
- Application: likely tests only around existing `ArchiveLevelUseCase`, `GetLevelsUseCase`, and
  `GetLeaderboardService`; production change only if a red test exposes an actual bug.
- Infrastructure: regression tests may inspect Prisma repository behavior and Prisma schema
  relation policy; production change only if preservation is not already guaranteed.
- Framework: API tests may document observable HTTP behavior; production route behavior should not
  change.
- Docs: `ai-log/` and compiled `AI_USAGE.md`; README changes only if verification reveals missing
  user-facing archive-score documentation.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`,
  `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects beyond existing DTO contracts
- [ ] Persistence/Prisma client used outside `src/infrastructure`
- [ ] Deleting leaderboard, leaderboard entries, player progress, or completed levels as part of
  archive

Required tests:

- Application archive regression: archiving a published level saves only the level and does not
  require leaderboard/progress collaborators.
- Application public catalog regression: archived levels are not returned by `GetLevelsUseCase`.
- Application leaderboard regression: leaderboard entries are returned for an archived known level.
- Persistence/schema regression: Prisma relations from leaderboard/progress history to levels use
  restrictive references, not cascade deletion from level.
- API regression: `GET /levels` omits archived levels through the public use case, while
  `GET /leaderboard/:levelId` returns entries for the same archived `levelId`.

Architecture acceptance criteria:

- Given archive is a level-catalog mutation, When its use case is inspected, Then it depends only on
  `LevelRepository` and `Clock`.
- Given leaderboard/progress are historical records, When the Prisma schema is inspected, Then
  level relations for leaderboard and completed level history do not cascade-delete from `Level`.
- Given leaderboard read is level-status agnostic, When an archived level has entries, Then the
  leaderboard response still contains those entries.

## Edge cases

- A known archived level with no leaderboard should still behave like any known empty level:
  leaderboard read returns 200 with `entries: []`.
- Unknown level still returns 404 when no leaderboard exists.
- Public `GET /levels` must not leak archived levels after archive.
- Archive remains ADMIN-only and still rejects DRAFT levels through existing rules.

## Acceptance criteria (Given/When/Then)

- S1: Given a published level with leaderboard/progress history, When the admin archives the level,
  Then only the level state changes to `ARCHIVED` and no leaderboard/progress delete collaborator is
  used.
- S2: Given a published level was archived, When the public level catalog is requested, Then that
  archived level is not listed.
- S3: Given an archived level has leaderboard entries, When `GET /leaderboard/:levelId` is
  requested, Then the response is 200 and includes the existing entries.
- S4: Given an archived level has no leaderboard yet, When its leaderboard is requested, Then the
  response remains 200 with an empty `entries` array because the level is known.
- S5: Given a level has leaderboard and progress history, When persistence rules are inspected,
  Then level deletion is restricted for `Leaderboard` and `CompletedLevel` instead of cascading
  history deletion.
- S6: Given the public and leaderboard endpoints are exercised for the same archived level, When
  responses are compared, Then public catalog hides the level while leaderboard remains readable.

## Decisions

- **Close MAZ-200 primarily as regression coverage.** Current design already uses level status
  instead of hard deletion and Prisma restrictive relations for history. The ticket's value is a
  test gate that prevents future archive refactors from deleting score/progress history.
- **Do not add a new admin leaderboard endpoint.** AD-08 uses the existing
  `GET /leaderboard/:levelId`, and MAZ-200 only proves it remains valid for archived levels.
- **Do not broaden `ArchiveLevelUseCase` dependencies.** Adding leaderboard/progress collaborators
  to archive would increase coupling and risk the very deletion behavior this ticket protects
  against.

## Risks / OPEN QUESTIONS

- None. If tests reveal that existing infrastructure already preserves history, production code
  should remain unchanged.
