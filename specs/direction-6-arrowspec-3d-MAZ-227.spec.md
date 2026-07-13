# Spec — Add 6 directions and 3D ArrowSpec deltas (Backend)

Date: 2026-07-13
Ticket: `MAZ-227`
Source: M13 "3D Volumetric Boards" plan
Status: approved. The `@s` scenarios in `specs/direction-6-arrowspec-3d-MAZ-227.feature` are the executable contract for this slice.

## Purpose

Extend the `Direction` enum from 4 planar values to 6 by adding `FORWARD` (z+1) and `BACK` (z-1), and update `ArrowSpec` to carry 3-tuple deltas `[row, col, z]` and evaluate 3D orthogonal adjacency. This is B2 of the M13 "3D Volumetric Boards" milestone and unblocks B3 (solvability 3D raycast) and B5 (3D random generation).

## In scope / Out of scope

- In scope: `Direction` enum (2 new values), `ArrowSpec.DIRECTION_DELTAS` (3-tuple), `areOrthogonallyAdjacent` (3D Manhattan), `isStrictlyAhead` in `LevelSolvabilityPolicy` (FORWARD/BACK cases), `RandomLevelStrategy.DELTAS` type update.
- Out of scope: 3D random generation (B5/MAZ-231), BoardSize depth (B4/MAZ-229), solvability raycast (B3/MAZ-228), DTO/OpenAPI wire (B7/MAZ-232).

## Behavior

- `Direction.FORWARD` points in the positive z direction (depth increases); `Direction.BACK` points in the negative z direction.
- An `ArrowSpec` path is valid if every consecutive pair of `Position`s is orthogonally adjacent in 3D: exactly one of `|Δrow|`, `|Δcol|`, `|Δz|` equals 1 and the other two equal 0.
- The "points back" invariant holds across all 6 directions: the head cannot point toward its penultimate cell.
- `RandomLevelStrategy` continues to generate 2D levels only (FORWARD/BACK are in the delta map for type exhaustiveness but not in the direction pool).

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

- Domain: `enums/Direction.ts` (+FORWARD/BACK), `value-objects/ArrowSpec.ts` (3-tuple deltas, 3D adjacency), `LevelSolvabilityPolicy.ts` (isStrictlyAhead switch)
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

- Domain: 6 new ArrowSpec tests covering @s1–@s4 (3D path, z adjacency, 3D diagonal rejection, points-back on z) + 5 existing 2D regression tests (@s5).
- Application: none (no application layer touched).
- Adapter/API: none.

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then dependencies point inward only.
- Given boundaries are crossed, When DTOs are inspected, Then they are simple records/primitives.
- Given business invariants are involved, When implementation is inspected, Then they live in VO/domain, not controllers/middleware.

## Edge cases

- Path moving along z-axis only (row and col constant) — valid.
- Diagonal move touching two axes simultaneously (e.g., Δrow=1, Δz=1) — rejected as not orthogonally connected.
- Arrow with direction FORWARD whose head would translate BACK into penultimate cell — rejected as "points back".
- Existing 2D paths with UP/DOWN/LEFT/RIGHT — unaffected (zDelta defaults to 0).

## Acceptance criteria (Given/When/Then)

- S1: Given a path [(0,0,0),(0,0,1)] with direction FORWARD, When ArrowSpec.create is called, Then it succeeds and head equals (0,0,1).
- S2: Given positions (0,0,0) and (0,0,1), When adjacency is evaluated, Then they are considered orthogonally adjacent.
- S3: Given positions (0,0,0) and (1,0,1), When adjacency is evaluated, Then they are NOT adjacent (Manhattan 3D = 2).
- S4: Given a path [(0,0,0),(0,0,1)] with direction BACK, When ArrowSpec.create is called, Then it throws "points back".
- S5: Given any valid 2D path with UP/DOWN/LEFT/RIGHT, When ArrowSpec.create is called, Then it succeeds (no regression).

## Decisions

- **FORWARD/BACK naming**: chosen over IN/OUT or UP_Z/DOWN_Z for clarity in a spatial context; consistent with the client-side B-series naming convention.
- **RandomLevelStrategy pool stays 2D**: adding FORWARD/BACK to the direction pool is B5's scope; this ticket only fixes the type exhaustiveness.
- **LevelSolvabilityPolicy.isStrictlyAhead fixed here, not deferred to B3**: TypeScript enforces exhaustive switches; deferring would leave a compile error on develop.

## Risks / OPEN QUESTIONS

- None. Strictly additive to the domain with no migration required (arrows stored as JSONB, and 2D levels remain `z=0` slab throughout).
