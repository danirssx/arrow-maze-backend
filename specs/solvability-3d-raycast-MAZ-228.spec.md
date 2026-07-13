# Spec — Make LevelSolvabilityPolicy raycast 3D (MAZ-228)

Date: 2026-07-13
Ticket: `MAZ-228`
Source: M13 "3D Volumetric Boards" plan
Status: approved. The `@s` scenarios in `specs/solvability-3d-raycast-MAZ-228.feature` are the executable contract for this slice.

## Purpose

Extend `LevelSolvabilityPolicy.isStrictlyAhead` so that planar directions (UP/DOWN/LEFT/RIGHT) also fix the z-coordinate. In 3D, an arrow pointing UP at depth z=1 must not be considered blocked by another arrow that occupies the same column but at depth z=0. Each of the 6 directions now fixes exactly two coordinates and compares the third along the ray.

## In scope / Out of scope

- In scope: `isStrictlyAhead` in `LevelSolvabilityPolicy.ts` — add `cell.z === head.z` guard to UP, DOWN, LEFT, RIGHT cases.
- Out of scope: `buildBlockingGraph`, `isAcyclic`, `isSolvable` (dimension-agnostic, untouched). BoardSize, DTOs, OpenAPI (B4/B7). Random generation (B5).

## Behavior

- `isStrictlyAhead(head, UP, cell)` → true iff `cell.col === head.col && cell.z === head.z && cell.row < head.row`
- `isStrictlyAhead(head, DOWN, cell)` → true iff `cell.col === head.col && cell.z === head.z && cell.row > head.row`
- `isStrictlyAhead(head, LEFT, cell)` → true iff `cell.row === head.row && cell.z === head.z && cell.col < head.col`
- `isStrictlyAhead(head, RIGHT, cell)` → true iff `cell.row === head.row && cell.z === head.z && cell.col > head.col`
- `FORWARD`/`BACK` already fix row and col (added in B2) — unchanged.
- 2D levels (all z=0): `cell.z === head.z` is always `0 === 0` → fully backward-compatible.

## HTTP contract (if applicable)

Not applicable — domain-only change.

## Clean Architecture contract

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (no business rules, no infra/framework imports)
- [x] Repositorios: interfaz adentro (port), implementación afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [x] Invariantes en VO/agregados (no en controllers/services de aplicación)
- [x] Errores de dominio sin semántica HTTP (mapping HTTP solo en `framework`)

Layer impact:

- Domain: `LevelSolvabilityPolicy.ts` — 4 lines modified in `isStrictlyAhead`
- Application: no changes
- Infrastructure: no changes
- Framework: no changes

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: 5 new LevelSolvabilityPolicy tests covering @s1–@s5 (cycle on same z-plane, no block across z-planes for UP and RIGHT, 2D regression, planar cycle on non-zero z).
- Application: none.
- Adapter/API: none.

Architecture acceptance criteria:

- Given the touched layers, When imports are inspected, Then dependencies point inward only.
- Given the 4 modified lines, When the z-guard is removed, Then the new tests fail (mutation gate).

## Edge cases

- 2D arrow (z=0) blocked by 2D arrow — still works (`0 === 0`).
- 3D arrow at z=N NOT blocked by same-axis arrow at z≠N.
- FORWARD/BACK unaffected (already fixed two coords in B2).

## Acceptance criteria (Given/When/Then)

- S1: Given arrow A at (2,1,1) UP and B at (0,1,1) DOWN — same z-plane → cycle → false.
- S2: Given arrow A at (2,1,1) UP and B at (0,1,0) DOWN — different z → no block → true.
- S3: Given arrow A at (0,0,2) RIGHT and B at (0,1,0) LEFT — different z → no block → true.
- S4: Given 2D arrows A→RIGHT and B→LEFT (all z=0) → cycle still detected → false.
- S5: Given arrow A at (0,0,3) RIGHT and B at (0,2,3) LEFT — same z=3 → cycle → false.

## Decisions

- **Add z-guard to 4 planar cases only**: FORWARD/BACK were already correct from B2. Changing only 4 lines minimizes blast radius.
- **No change to graph/topo-sort**: the DAG algorithm is dimension-agnostic; only the edge-building predicate changes.

## Risks / OPEN QUESTIONS

- None. 2D backward-compatibility guaranteed since `cell.z === head.z` trivially holds for all z=0 positions.
