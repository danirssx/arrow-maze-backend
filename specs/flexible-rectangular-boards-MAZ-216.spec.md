# Spec - Flexible rectangular board definitions in admin level creation (MAZ-216)

Date: 2026-07-09
Ticket: `MAZ-216`
Source: Linear `MAZ-216` / M12-04
Status: Backlog, draft for human gate. The `@s` scenarios in
`specs/flexible-rectangular-boards-MAZ-216.feature` must be approved before TDD.

## Purpose

The backend must be the authoritative validator for admin-authored rectangular boards.
It should accept explicit non-preset `boardSize` dimensions within M12 limits, reject
oversize boards or too many arrows, ensure arrow paths stay inside the rectangle, and
persist/read the result in a shape the mobile client already understands.

## In scope / Out of scope

- In scope: admin create-level request accepts optional `boardSize`, validates `rows <= 12`,
  `cols <= 12`, `arrows.length <= 60`, and arrow containment in the rectangle.
- In scope: rectangular `boardSize` is normalized to a full `CELL_MASK` `boardShape` before
  persistence/read so existing mobile rendering can frame empty rectangle cells.
- In scope: OpenAPI documents the rectangular input and limit errors.
- Out of scope: irregular masks as a new M12 authoring feature, mobile client changes,
  database schema migration, seeded catalog redesign, and changing previously approved
  abstract shaped-board support.

## Behavior

New admin request field:

```json
{
  "boardSize": { "rows": 8, "cols": 10 }
}
```

Rules:

- `boardSize` is optional to preserve existing MAZ-148/MAZ-207 create requests.
- When present, `rows` and `cols` must be positive integers.
- `rows <= 12` and `cols <= 12`.
- `arrows.length <= 60`.
- Every arrow path cell must satisfy `0 <= row < rows` and `0 <= col < cols`.
- A valid rectangular request is stored/exposed as a full rectangle `boardShape`
  (`CELL_MASK` with all cells in row-major order), unless a future approved contract adds
  a separate persisted board-size field.
- `boardSize` and explicit `boardShape` must not be combined in one admin request for this
  slice; that avoids ambiguous precedence between rectangular and irregular authoring.

## HTTP contract

- `POST /levels` admin request may include `boardSize`.
- Success remains `201` with `{ status: "success", data: { levelId } }`.
- Invalid `boardSize`, oversize dimensions, >60 arrows, out-of-bounds arrow cells, or a
  request that combines `boardSize` with `boardShape` returns a controlled validation error.
- Existing authenticated/admin authorization behavior is unchanged.
- `GET /levels/:levelId` continues returning `definition.boardShape` for shaped/framed
  levels; mobile compatibility is achieved through that existing field.

## Clean Architecture contract

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (no business rules, no infra/framework imports)
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [x] Invariantes en VO/agregados (no en controllers/services de aplicación)
- [x] Errores de dominio sin semántica HTTP (mapping HTTP solo en `framework`)

Layer impact:

- Domain: add or extend a rectangular board-size invariant near level-catalog value objects
  without importing framework/infrastructure. `LevelDefinition`/`Level` enforce arrow-count
  and rectangle containment only through domain-owned rules.
- Application: `CreateLevelInput` gains `boardSize`; mapping validates DTOs and normalizes
  a rectangle to a `BoardShape` before `Level.draft`. Existing `UpdateLevelDefinitionUseCase`
  needs an explicit decision/test for whether board size is immutable after creation.
- Infrastructure: no schema change expected; existing `boardShape` persistence stores the
  normalized rectangle.
- Framework: controller forwards `boardSize`; OpenAPI adds `BoardSizeInput` and examples.

Forbidden moves:

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: accepts 12x12/60-arrow boundary; rejects oversize dimensions, too many arrows,
  and out-of-bounds arrow cells.
- Application: create use case maps valid `boardSize` to full rectangle `boardShape` and
  rejects invalid or ambiguous payloads before persistence.
- Adapter/API: controller forwards `boardSize`; API tests cover 201, oversize, >60 arrows,
  out-of-bounds cells, and OpenAPI schema.

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then dependencies point inward only.
- Given `boardSize` crosses boundaries, When DTOs are inspected, Then they are simple records/primitives.
- Given rectangular-board invariants are involved, When implementation is inspected, Then they live in domain/application mapping, not controllers.

## Edge cases

- `boardSize` omitted: existing create behavior remains unchanged.
- `boardSize` plus `boardShape`: rejected with a controlled validation error.
- 12x12 with 60 arrows: valid when all arrow cells are in bounds and existing ArrowSpec/DAG rules pass.
- 13x12, 12x13, zero, negative, fractional, missing rows/cols: invalid.
- Arrow path with negative row/col or row/col equal to the bound: invalid for a rectangular board.
- Existing abstract shaped levels already persisted as `boardShape` remain readable.

## Acceptance criteria (Given/When/Then)

- S1: Given an admin create request with `boardSize: { rows: 8, cols: 10 }` and valid arrows inside the rectangle, When the backend creates the level, Then it returns 201 and persists a full rectangular `boardShape`.
- S2: Given an existing create request without `boardSize`, When the backend creates the level, Then existing MAZ-148/MAZ-207 behavior is preserved.
- S3: Given `boardSize` rows or cols greater than 12, When the backend validates the request, Then it returns a controlled validation error and no level is persisted.
- S4: Given more than 60 arrows, When the backend validates the request, Then it returns a controlled validation error and no level is persisted.
- S5: Given an arrow path cell outside the declared rectangle, When the backend validates the request, Then it returns a controlled validation error and no level is persisted.
- S6: Given a request that includes both `boardSize` and `boardShape`, When the backend validates the request, Then it returns a controlled validation error.
- S7: Given the exported OpenAPI spec, When schemas are inspected, Then `CreateLevelRequest` documents `boardSize` and the 12x12/60-arrow limits.

## Decisions

- Use `boardSize` as the request DTO for M12 rectangular authoring.
  Reason: it expresses rectangles directly and avoids overloading irregular masks.
- Normalize valid rectangles to full `CELL_MASK` for persistence/read.
  Reason: existing backend persistence and mobile client already support `boardShape`;
  no database migration is needed.
- Reject `boardSize` + `boardShape` in the same create request.
  Reason: precedence would be ambiguous and irregular authoring is not part of MAZ-216.

## Risks / OPEN QUESTIONS

- Human gate must approve `boardSize` and rectangle-to-`boardShape` normalization.
- If board dimensions must be mutable after draft creation, `UpdateLevelDefinitionUseCase`
  needs a separately approved request field and scenarios.
